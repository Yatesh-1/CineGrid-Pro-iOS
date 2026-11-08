import React from 'react';
import type { CapturedPhoto } from '../types/camera';
import { StudioWorkspace } from './studio/StudioWorkspace';

interface PhotoEditorModalProps {
  photo: CapturedPhoto | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveEditedPhoto: (id: string, editedDataUrl: string) => void;
}

export const PhotoEditorModal: React.FC<PhotoEditorModalProps> = ({
  photo,
  isOpen,
  onClose,
  onSaveEditedPhoto,
}) => {
  return (
    <StudioWorkspace
      photo={photo}
      isOpen={isOpen}
      onClose={onClose}
      onSaveEdited={onSaveEditedPhoto}
    />
  );
};
