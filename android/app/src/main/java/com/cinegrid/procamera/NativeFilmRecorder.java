package com.cinegrid.procamera;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaCodec;
import android.media.MediaCodecInfo;
import android.media.MediaFormat;
import android.media.MediaMuxer;
import android.media.MediaRecorder;
import android.view.Surface;

import androidx.core.content.ContextCompat;

import java.io.File;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.List;

/**
 * H.264 video + AAC audio recorder for the native film pipeline.
 *
 * Video arrives through the encoder's input Surface (the GL thread draws the film-processed frame into it), so no
 * frame is ever copied to the CPU. Audio is read from the microphone on its own thread. Both are timestamped on one
 * clock (System.nanoTime since start()) and packaged by MediaMuxer. If the microphone is unavailable the file is
 * video-only and result.audio says so: nothing is faked.
 */
final class NativeFilmRecorder {
    static final class Result {
        File file;
        int width, height;
        long frames;
        long durationMs;
        double avgFps;
        long bytes;
        boolean audio;
        String audioNote = "";
        String videoEncoder = "";
        String audioEncoder = "";
    }

    private static final String VIDEO_MIME = "video/avc";
    private static final String AUDIO_MIME = "audio/mp4a-latm";
    private static final int AUDIO_RATE = 44100;

    private final File outFile;
    private final int width;
    private final int height;
    private MediaCodec vEnc;
    private MediaCodec aEnc;
    private AudioRecord audioRec;
    private Mux mux;
    private Surface inputSurface;
    private Thread audioThread;
    private volatile boolean stopAudio;
    private int vTrack = -1;
    private int aTrack = -1;
    private long startNs;
    private long firstPtsNs = -1;
    private long lastPtsNs;
    private long frames;
    private boolean audioOk;
    private String videoCodecName = "";
    private String audioCodecName = "";
    private String audioNote = "";
    private final MediaCodec.BufferInfo vInfo = new MediaCodec.BufferInfo();

    NativeFilmRecorder(Context ctx, File outFile, int width, int height, int bitrate, boolean wantAudio) throws Exception {
        this.outFile = outFile;
        this.width = width;
        this.height = height;
        File dir = outFile.getParentFile();
        if (dir != null && !dir.exists() && !dir.mkdirs()) throw new IllegalStateException("Could not create the video folder.");

        MediaFormat vf = MediaFormat.createVideoFormat(VIDEO_MIME, width, height);
        vf.setInteger(MediaFormat.KEY_COLOR_FORMAT, MediaCodecInfo.CodecCapabilities.COLOR_FormatSurface);
        vf.setInteger(MediaFormat.KEY_BIT_RATE, bitrate);
        vf.setInteger(MediaFormat.KEY_FRAME_RATE, 30);
        vf.setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 1);
        vEnc = MediaCodec.createEncoderByType(VIDEO_MIME);
        vEnc.configure(vf, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE);
        inputSurface = vEnc.createInputSurface();
        videoCodecName = vEnc.getName(); // the real codec the device picked, e.g. a hardware encoder

        boolean haveMic = wantAudio && ContextCompat.checkSelfPermission(ctx, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
        if (wantAudio && !haveMic) audioNote = "microphone permission not granted";
        if (haveMic) {
            try {
                int min = AudioRecord.getMinBufferSize(AUDIO_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT);
                audioRec = new AudioRecord(MediaRecorder.AudioSource.CAMCORDER, AUDIO_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, Math.max(min * 4, 16384));
                if (audioRec.getState() != AudioRecord.STATE_INITIALIZED) throw new IllegalStateException("AudioRecord did not initialise");
                MediaFormat af = MediaFormat.createAudioFormat(AUDIO_MIME, AUDIO_RATE, 1);
                af.setInteger(MediaFormat.KEY_AAC_PROFILE, MediaCodecInfo.CodecProfileLevel.AACObjectLC);
                af.setInteger(MediaFormat.KEY_BIT_RATE, 128000);
                af.setInteger(MediaFormat.KEY_MAX_INPUT_SIZE, 16384);
                aEnc = MediaCodec.createEncoderByType(AUDIO_MIME);
                aEnc.configure(af, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE);
                audioCodecName = aEnc.getName();
                audioOk = true;
            } catch (Exception e) {
                audioNote = "microphone unavailable: " + e.getMessage();
                if (audioRec != null) { try { audioRec.release(); } catch (Exception ignored) { } audioRec = null; }
                if (aEnc != null) { try { aEnc.release(); } catch (Exception ignored) { } aEnc = null; }
                audioOk = false;
            }
        }
        mux = new Mux(new MediaMuxer(outFile.getAbsolutePath(), MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4), audioOk ? 2 : 1);
    }

    Surface inputSurface() {
        return inputSurface;
    }

    /** Nanoseconds since start(); the GL thread stamps each frame with this. */
    long nowNs() {
        return System.nanoTime() - startNs;
    }

    void start() {
        startNs = System.nanoTime();
        vEnc.start();
        if (audioOk) {
            aEnc.start();
            audioRec.startRecording();
            stopAudio = false;
            audioThread = new Thread(this::audioLoop, "film-audio");
            audioThread.start();
        }
    }

    /** Called by the GL thread right after it submitted a frame stamped ptsNs. */
    void onVideoFrame(long ptsNs) {
        if (firstPtsNs < 0) firstPtsNs = ptsNs;
        lastPtsNs = ptsNs;
        frames++;
        drainVideo(false);
    }

    void drainVideo(boolean untilEos) {
        int idleSpins = 0;
        while (true) {
            int idx = vEnc.dequeueOutputBuffer(vInfo, untilEos ? 10_000 : 0);
            if (idx == MediaCodec.INFO_TRY_AGAIN_LATER) {
                if (!untilEos || ++idleSpins > 300) return; // ~3 s without output at EOS: give up rather than hang
                continue;
            }
            idleSpins = 0;
            if (idx == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                vTrack = mux.add(vEnc.getOutputFormat());
            } else if (idx >= 0) {
                ByteBuffer buf = vEnc.getOutputBuffer(idx);
                if ((vInfo.flags & MediaCodec.BUFFER_FLAG_CODEC_CONFIG) != 0) vInfo.size = 0;
                if (vInfo.size > 0 && buf != null && vTrack >= 0) mux.write(vTrack, buf, vInfo);
                vEnc.releaseOutputBuffer(idx, false);
                if ((vInfo.flags & MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) return;
            }
        }
    }

    private void audioLoop() {
        byte[] buf = new byte[4096];
        long audioStartNs = System.nanoTime();
        long samples = 0;
        MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
        while (!stopAudio) {
            int n = audioRec.read(buf, 0, buf.length);
            if (n > 0) {
                long ptsUs = (audioStartNs - startNs) / 1000 + samples * 1_000_000L / AUDIO_RATE;
                feedAudio(buf, n, ptsUs, false);
                samples += n / 2;
            }
            drainAudio(info, false);
        }
        long ptsUs = (audioStartNs - startNs) / 1000 + samples * 1_000_000L / AUDIO_RATE;
        feedAudio(buf, 0, ptsUs, true);
        drainAudio(info, true);
    }

    private void feedAudio(byte[] data, int n, long ptsUs, boolean eos) {
        int idx = aEnc.dequeueInputBuffer(10_000);
        if (idx < 0) return;
        ByteBuffer in = aEnc.getInputBuffer(idx);
        in.clear();
        if (n > 0) in.put(data, 0, n);
        aEnc.queueInputBuffer(idx, 0, n, ptsUs, eos ? MediaCodec.BUFFER_FLAG_END_OF_STREAM : 0);
    }

    private void drainAudio(MediaCodec.BufferInfo info, boolean untilEos) {
        int idle = 0;
        while (true) {
            int idx = aEnc.dequeueOutputBuffer(info, untilEos ? 10_000 : 0);
            if (idx == MediaCodec.INFO_TRY_AGAIN_LATER) {
                if (!untilEos || ++idle > 300) return;
                continue;
            }
            idle = 0;
            if (idx == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                aTrack = mux.add(aEnc.getOutputFormat());
            } else if (idx >= 0) {
                ByteBuffer buf = aEnc.getOutputBuffer(idx);
                if ((info.flags & MediaCodec.BUFFER_FLAG_CODEC_CONFIG) != 0) info.size = 0;
                if (info.size > 0 && buf != null && aTrack >= 0) mux.write(aTrack, buf, info);
                aEnc.releaseOutputBuffer(idx, false);
                if ((info.flags & MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) return;
            }
        }
    }

    /** Ends the recording and returns what was really written. Must be called after the GL thread stopped feeding frames. */
    Result finish() {
        try { vEnc.signalEndOfInputStream(); } catch (Exception ignored) { }
        drainVideo(true);
        stopAudio = true;
        if (audioThread != null) {
            try { audioThread.join(3000); } catch (InterruptedException ignored) { }
        }
        try { vEnc.stop(); } catch (Exception ignored) { }
        try { vEnc.release(); } catch (Exception ignored) { }
        if (aEnc != null) {
            try { aEnc.stop(); } catch (Exception ignored) { }
            try { aEnc.release(); } catch (Exception ignored) { }
        }
        if (audioRec != null) {
            try { audioRec.stop(); } catch (Exception ignored) { }
            try { audioRec.release(); } catch (Exception ignored) { }
        }
        try { inputSurface.release(); } catch (Exception ignored) { }
        mux.finish();

        Result r = new Result();
        r.file = outFile;
        r.width = width;
        r.height = height;
        r.frames = frames;
        r.durationMs = frames > 1 ? (lastPtsNs - firstPtsNs) / 1_000_000L : 0;
        r.avgFps = r.durationMs > 0 ? (frames - 1) * 1000.0 / r.durationMs : 0;
        r.bytes = outFile.length();
        r.audio = audioOk;
        r.audioNote = audioNote;
        r.videoEncoder = "H.264 via " + videoCodecName;
        r.audioEncoder = audioOk ? "AAC-LC 44.1 kHz mono 128 kbps via " + audioCodecName : "none";
        return r;
    }

    // ---------------------------------------------------------------------------------------------------------

    /** MediaMuxer needs every track added before start(); samples that arrive earlier are held, then flushed. */
    private static final class Mux {
        private final MediaMuxer muxer;
        private final int expected;
        private int added;
        private boolean started;
        private boolean released;
        private final List<Object[]> pending = new ArrayList<>();

        Mux(MediaMuxer m, int expectedTracks) {
            muxer = m;
            expected = expectedTracks;
        }

        synchronized int add(MediaFormat f) {
            int t = muxer.addTrack(f);
            added++;
            if (added == expected) {
                muxer.start();
                started = true;
                for (Object[] p : pending) {
                    MediaCodec.BufferInfo bi = new MediaCodec.BufferInfo();
                    byte[] d = (byte[]) p[1];
                    bi.set(0, d.length, (Long) p[2], (Integer) p[3]);
                    muxer.writeSampleData((Integer) p[0], ByteBuffer.wrap(d), bi);
                }
                pending.clear();
            }
            return t;
        }

        synchronized void write(int track, ByteBuffer buf, MediaCodec.BufferInfo info) {
            if (released) return;
            buf.position(info.offset);
            buf.limit(info.offset + info.size);
            if (started) {
                muxer.writeSampleData(track, buf, info);
            } else {
                byte[] d = new byte[info.size];
                buf.get(d);
                pending.add(new Object[]{track, d, info.presentationTimeUs, info.flags});
            }
        }

        synchronized void finish() {
            if (released) return;
            released = true;
            try { if (started) muxer.stop(); } catch (Exception ignored) { }
            try { muxer.release(); } catch (Exception ignored) { }
        }
    }
}
