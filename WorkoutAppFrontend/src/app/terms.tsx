import { CONTACT_EMAIL, LegalPage, OPERATOR } from '@/components/legal/LegalPage';

export default function TermsScreen() {
  return (
    <LegalPage
      title="Terms of Use"
      sections={[
        {
          heading: 'The agreement',
          body: [
            `These terms are between you and ${OPERATOR}, who runs Corda (corda.fit). By using Corda you agree to them. You must be 18 or over.`,
          ],
        },
        {
          heading: 'The service',
          body: [
            'Corda gives coaches tools to plan and follow their clients’ training and nutrition, and gives clients a place to log it.',
            'Corda is free during early access. If paid plans are introduced, you will be told in advance and nothing is charged without your agreement. Features may change while the app is in early access.',
          ],
        },
        {
          heading: 'Not medical advice',
          body: [
            'Corda, and any programme or advice a coach gives through it, is not medical advice. Nutrition estimates from photos or descriptions are approximate and can be wrong.',
            'Check with a doctor before starting a new training or nutrition plan, especially if you have a health condition, are pregnant, or are injured.',
          ],
        },
        {
          heading: 'Coaches',
          body: [
            'Coaches are responsible for the advice they give, and for adding only people who have agreed to be coached by them.',
            'A coach may use a client’s data only to coach that client.',
          ],
        },
        {
          heading: 'Your account and content',
          body: [
            'Keep access to your email secure; it is how you sign in. Give accurate information.',
            'What you log and send stays yours. You let us store and process it only to provide Corda to you and, if you have one, your coach.',
          ],
        },
        {
          heading: 'Acceptable use',
          body: [
            'Do not use Corda for anything unlawful, to harass or abuse anyone, or to try to access data that is not yours or disrupt the service.',
            'We may suspend or close an account that breaks these terms.',
          ],
        },
        {
          heading: 'Ending',
          body: [
            'You can delete your account from your profile at any time. See the Privacy Policy for what happens to your data.',
          ],
        },
        {
          heading: 'Liability',
          body: [
            'Corda is provided as is, without warranties. To the extent the law allows, we are not liable for indirect or consequential loss, or for results of training or nutrition choices made using the app. Nothing here limits liability that cannot be limited by law.',
          ],
        },
        {
          heading: 'Law',
          body: [
            'These terms are governed by the laws of India, and the courts of Kochi, Kerala have jurisdiction.',
          ],
        },
        {
          heading: 'Contact',
          body: [`${CONTACT_EMAIL}`],
        },
      ]}
    />
  );
}
