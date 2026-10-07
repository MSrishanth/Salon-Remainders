import assert from 'node:assert';
import { isBillableQualifiedEnquiry } from './controllers/leadController.js';

console.log('Running Billing Engine Rule Tests...\n');

const runTest = (name, testFn) => {
  try {
    testFn();
    console.log(`✅ PASS: ${name}`);
  } catch (error) {
    console.error(`❌ FAIL: ${name}`);
    console.error(error.message);
  }
};

runTest('Valid salon appointment is billable', () => {
  const result = isBillableQualifiedEnquiry({
    name: 'John Doe',
    phone: '1234567890',
    enquiryType: 'SALON_APPOINTMENT',
    service: 'Haircut'
  });
  assert.strictEqual(result.billable, true);
});

runTest('Missing contact details is NOT billable', () => {
  const result = isBillableQualifiedEnquiry({
    name: 'John Doe',
    enquiryType: 'GENERAL_ENQUIRY',
    service: 'Haircut'
    // missing phone
  });
  assert.strictEqual(result.billable, false);
  assert.match(result.reason, /Missing contact details/);
});

runTest('Spam message containing "viagra" is NOT billable', () => {
  const result = isBillableQualifiedEnquiry({
    name: 'Spammer',
    phone: '1234567890',
    message: 'Buy cheap viagra now',
    enquiryType: 'WHATSAPP_INTENT'
  });
  assert.strictEqual(result.billable, false);
  assert.match(result.reason, /SPAM/);
});

runTest('Test submissions are NOT billable', () => {
  const result = isBillableQualifiedEnquiry({
    name: 'Test',
    phone: '1234567890',
    enquiryType: 'GENERAL_ENQUIRY',
    service: 'Haircut'
  });
  assert.strictEqual(result.billable, false);
  assert.match(result.reason, /TEST/);
});

runTest('Appointment missing service requirement is NOT billable', () => {
  const result = isBillableQualifiedEnquiry({
    name: 'Jane Doe',
    phone: '0987654321',
    enquiryType: 'SALON_APPOINTMENT'
    // missing service
  });
  assert.strictEqual(result.billable, false);
  assert.match(result.reason, /Missing service requirement/);
});

console.log('\nTesting Complete.');
