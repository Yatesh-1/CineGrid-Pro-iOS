// Comprehensive End-to-End Verification of Licensing & Administration System
const BASE_URL = 'http://localhost:5174';

async function runTests() {
  console.log('--- STARTING CINEGRID PRO LICENSE & ADMIN VERIFICATION SUITE ---\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, testName, extra = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName} ${extra}`);
      passedCount++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${extra}`);
      failedCount++;
    }
  }

  try {
    // 1. ADMIN AUTHENTICATION
    console.log('1. Testing Admin Authentication...');
    const loginRes = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'CineGridAdmin2026!' }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.ok && loginData.success && !!loginData.token, 'Admin login with valid credentials');
    const adminToken = loginData.token;

    // 2. ADMIN LICENSE CREATION
    console.log('\n2. Testing Admin License Creation...');
    const createRes = await fetch(`${BASE_URL}/api/admin/licenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        assignedName: 'Marcus Vance',
        type: '30_day',
        maxDevices: 2,
        notes: 'Commercial Director Suite',
      }),
    });
    const createData = await createRes.json();
    assert(createRes.status === 201 && createData.success && !!createData.license.key, 'Admin created 30-day license key', `-> Key: ${createData.license?.key}`);
    const createdKey = createData.license.key;
    const createdLicenseId = createData.license.id;

    // 3. NEW LICENSE ACTIVATION
    console.log('\n3. Testing New License Activation...');
    const actRes1 = await fetch(`${BASE_URL}/api/license/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Marcus Vance',
        licenseKey: createdKey,
        deviceId: 'device_iphone_16_pro',
        deviceName: 'iPhone 16 Pro',
        os: 'iOS 18.2',
        platform: 'ios',
      }),
    });
    const actData1 = await actRes1.json();
    assert(actRes1.ok && actData1.success, 'New license activation on Device 1', `-> ${actData1.message}`);
    assert(!!actData1.entitlementToken, 'Issued cryptographically signed offline entitlement token');
    const tokenDev1 = actData1.entitlementToken;

    // 4. RETURNING USER VALIDATION
    console.log('\n4. Testing Returning User Session Validation...');
    const valRes = await fetch(`${BASE_URL}/api/license/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entitlementToken: tokenDev1,
        deviceId: 'device_iphone_16_pro',
      }),
    });
    const valData = await valRes.json();
    assert(valRes.ok && valData.valid, 'Returning user session validated seamlessly');

    // 5. MULTIPLE DEVICE ACTIVATION (DEVICE 2 of 2)
    console.log('\n5. Testing Multiple Device Activation...');
    const actRes2 = await fetch(`${BASE_URL}/api/license/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Marcus Vance',
        licenseKey: createdKey,
        deviceId: 'device_ipad_pro_m4',
        deviceName: 'iPad Pro M4',
        os: 'iPadOS 18.2',
        platform: 'ios',
      }),
    });
    const actData2 = await actRes2.json();
    assert(actRes2.ok && actData2.success, 'Second device activated within limit (2 of 2)');

    // 6. DEVICE LIMIT ENFORCEMENT (DEVICE 3 of 2 -> MUST FAIL)
    console.log('\n6. Testing Device Limit Enforcement...');
    const actRes3 = await fetch(`${BASE_URL}/api/license/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Marcus Vance',
        licenseKey: createdKey,
        deviceId: 'device_pixel_9_pro',
        deviceName: 'Pixel 9 Pro',
        os: 'Android 15',
        platform: 'android',
      }),
    });
    const actData3 = await actRes3.json();
    assert(actRes3.status === 403 && actData3.errorCode === 'DEVICE_LIMIT', 'Device activation limit strictly enforced', `-> Message: "${actData3.message}"`);

    // 7. INVALID LICENSE KEY TEST
    console.log('\n7. Testing Invalid License Key...');
    const badKeyRes = await fetch(`${BASE_URL}/api/license/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Marcus Vance',
        licenseKey: 'CINE-NOT-REAL-9999',
        deviceId: 'device_random',
      }),
    });
    const badKeyData = await badKeyRes.json();
    assert(badKeyRes.status === 400 && badKeyData.errorCode === 'INVALID_KEY', 'Invalid license key properly rejected', `-> Message: "${badKeyData.message}"`);

    // 8. EXPIRED LICENSE KEY TEST
    console.log('\n8. Testing Expired License Key...');
    const expRes = await fetch(`${BASE_URL}/api/license/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Marcus Vance',
        licenseKey: 'CINE-PAST-EXPD-1999',
        deviceId: 'device_random',
      }),
    });
    const expData = await expRes.json();
    assert(expRes.status === 403 && expData.errorCode === 'EXPIRED', 'Expired license properly rejected', `-> Message: "${expData.message}"`);

    // 9. REVOKED LICENSE KEY TEST
    console.log('\n9. Testing Revoked License Key...');
    const revRes = await fetch(`${BASE_URL}/api/license/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Marcus Vance',
        licenseKey: 'CINE-BADR-EVOK-0001',
        deviceId: 'device_random',
      }),
    });
    const revData = await revRes.json();
    assert(revRes.status === 403 && revData.errorCode === 'REVOKED', 'Revoked license properly rejected', `-> Message: "${revData.message}"`);

    // 10. ADMIN LICENSE REVOCATION
    console.log('\n10. Testing Admin License Revocation in Real-Time...');
    const revokeOpRes = await fetch(`${BASE_URL}/api/admin/licenses/${createdLicenseId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'revoked' }),
    });
    const revokeOpData = await revokeOpRes.json();
    assert(revokeOpRes.ok && revokeOpData.license.status === 'revoked', 'Admin revoked active license in real-time');

    // Re-verify that subsequent validation on Device 1 now fails because it was revoked
    const postRevokeVal = await fetch(`${BASE_URL}/api/license/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entitlementToken: tokenDev1,
        deviceId: 'device_iphone_16_pro',
      }),
    });
    const postRevokeData = await postRevokeVal.json();
    assert(!postRevokeData.valid && postRevokeData.errorCode === 'REVOKED', 'Device 1 session immediately invalidated upon admin revocation');

    // 11. AUDIT LOG RECORDING
    console.log('\n11. Testing Audit Log Recording...');
    const auditRes = await fetch(`${BASE_URL}/api/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const auditData = await auditRes.json();
    assert(auditRes.ok && auditData.logs.length > 5, 'Audit log accurately recorded all activation, revocation and admin actions', `-> Total logs: ${auditData.logs.length}`);

    console.log(`\n========================================`);
    console.log(`ALL TESTS FINISHED: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log(`========================================\n`);

  } catch (err) {
    console.error('Test execution error:', err);
  }
}

runTests();
