import { sendTransactionalEmail } from './backend/services/emailService.js';
async function test() {
  try {
    await sendTransactionalEmail('Kkonduri1996@gmail.com', 'Test Email', 'Hello', '<h1>Hello</h1>');
    console.log("Success");
  } catch (e) {
    console.error("Fail", e);
  }
}
test();
