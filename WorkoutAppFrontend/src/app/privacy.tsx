import { CONTACT_EMAIL, LegalPage, OPERATOR } from '@/components/legal/LegalPage';

export default function PrivacyScreen() {
  return (
    <LegalPage
      title="Privacy Policy"
      sections={[
        {
          heading: 'Who we are',
          body: [
            `Corda (corda.fit) is run by ${OPERATOR}, an individual based in India. Questions, requests and complaints about your data go to ${CONTACT_EMAIL}.`,
          ],
        },
        {
          heading: 'What we collect',
          body: [
            'Account details: your email address, name and phone number.',
            'Body and goals: height, weight, goal weight, weigh-ins and the targets set for you.',
            'Training and nutrition: routines, workouts and sets you log, notes, food entries, habits and weekly check-ins.',
            'Meal photos and descriptions you choose to send for a nutrition estimate.',
            'Messages between a coach and their client.',
            'Technical data our providers record when the app talks to them, such as IP address and request times. We do not use advertising or analytics trackers.',
          ],
        },
        {
          heading: 'How we use it',
          body: [
            'To run the app: sign you in with a one-time code, store what you log, and show it back to you.',
            'To let coaching work: if you have a coach, they can see everything you log and send in chat, and Corda uses it to show them your progress, adherence and alerts. A coach can see only their own clients.',
            'We do not sell your data or use it for advertising.',
          ],
        },
        {
          heading: 'Who processes it for us',
          body: [
            'Supabase stores the database and handles sign-in (servers in Asia).',
            'Google (Gemini API) receives a meal photo or description only when you ask for a nutrition estimate, and returns the estimate.',
            'Cloudflare hosts the web app. Google (Gmail) delivers sign-in emails.',
            'Each of them processes data only to provide their service to us.',
          ],
        },
        {
          heading: 'How long we keep it',
          body: [
            'For as long as your account exists. You can delete your account from your profile at any time; your data is then deleted, apart from short-lived backups that expire on their own.',
            "If a coach deletes their account, their clients keep their own accounts and history.",
          ],
        },
        {
          heading: 'Your rights',
          body: [
            `You can ask to see, correct or delete your data, or withdraw your consent, by writing to ${CONTACT_EMAIL}. This includes your rights under India's Digital Personal Data Protection Act, 2023. We aim to reply within 30 days.`,
          ],
        },
        {
          heading: 'Security',
          body: [
            'Data travels over HTTPS, and database rules let each person read only their own data, plus their clients’ data for a coach.',
          ],
        },
        {
          heading: 'Age',
          body: ['Corda is for people aged 18 and over.'],
        },
        {
          heading: 'Changes',
          body: [
            'If this policy changes, the date above changes with it, and we will tell you in the app before a significant change takes effect.',
          ],
        },
      ]}
    />
  );
}
