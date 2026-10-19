import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { CONTACT_EMAIL, LEGAL_UPDATED } from '../data/legal';
import { formatDay } from '../lib/format';

const updated = formatDay(LEGAL_UPDATED, { year: 'numeric', month: 'long', day: 'numeric' });

function External({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

function Contact() {
  return CONTACT_EMAIL ? (
    <p>
      Questions or requests about this document: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
    </p>
  ) : (
    <>
      <p>Questions or requests about this document: contact the developer through the site where you found Ascent.</p>
      {import.meta.env.DEV && (
        <p className="callout callout--muted small">
          Developer note (only shown in development): set <code>VITE_CONTACT_EMAIL</code> in <code>.env.local</code> to
          show a contact address here.
        </p>
      )}
    </>
  );
}

function LegalLayout({ title, intro, other, children }: { title: string; intro: ReactNode; other: 'privacy' | 'terms'; children: ReactNode }) {
  return (
    <article className="page page--narrow legal">
      <a href="#/settings" className="link-btn legal__back">
        <ArrowLeft size={14} aria-hidden /> Settings
      </a>
      <header className="page-header">
        <h1>{title}</h1>
        <p className="muted small">Last updated {updated}</p>
      </header>
      <div className="legal__summary">{intro}</div>
      {children}
      <footer className="legal__footer small">
        {other === 'privacy' ? <a href="#/privacy">Privacy Policy</a> : <a href="#/terms">Terms of Service</a>}
        <span aria-hidden>·</span>
        <a href="#/settings">Settings</a>
      </footer>
    </article>
  );
}

export function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      other="terms"
      intro={
        <>
          <h2>The short version</h2>
          <ul>
            <li>
              Ascent has no server or database of its own. Your progress is stored in your browser and, if you sign in, in
              your own Google Drive.
            </li>
            <li>There are no ads, no analytics and no tracking, and your data is never sold.</li>
            <li>You can export, delete or disconnect your data at any time.</li>
          </ul>
        </>
      }
    >
      <section>
        <h2>What Ascent stores, and where</h2>
        <h3>In your browser</h3>
        <p>
          Everything you do in Ascent is saved in your browser's local storage on your device: the skills you've mastered,
          your goals, every session you log (sets, reps or hold times, and any added weight), the workouts you start and
          finish (with their times and calorie estimates), your body-weight entries and weight goal, your workout plan, and
          preferences such as weight units and reminder settings. This stays on your device unless you sign in or export a
          backup.
        </p>
        <h3>If you sign in with Google (optional)</h3>
        <ul>
          <li>
            Your name, email address and profile photo, which Google shares when you sign in. Ascent keeps them in your
            browser only to show which account you're using.
          </li>
          <li>
            A short-lived access token (it expires after about an hour), kept in your browser so Ascent can save to your
            Drive.
          </li>
          <li>
            Your progress, saved as files in an <strong>Ascent</strong> folder in your own Google Drive: one file with your
            mastered skills, goals and settings, and one readable file per training day with that day's workouts, sets and
            weigh-in.
          </li>
        </ul>
        <p>
          This data travels directly between your browser and Google over an encrypted connection. It never passes through,
          and is never stored on, any server run by Ascent.
        </p>
      </section>

      <section>
        <h2>Google sign-in and Google Drive</h2>
        <p>Ascent asks Google for these permissions only:</p>
        <ul>
          <li>
            <strong>Basic profile</strong> (<code>openid</code>, <code>email</code>, <code>profile</code>): your name,
            email address and photo, to show who's signed in.
          </li>
          <li>
            <strong>Google Drive, files created by Ascent</strong> (<code>drive.file</code>): to create, read and update the
            files in its own Ascent folder. It can't see, read or change any other files in your Drive.
          </li>
        </ul>
        <p>
          Ascent's use and transfer to any other app of information received from Google APIs will adhere to the{' '}
          <External href="https://developers.google.com/terms/api-services-user-data-policy">
            Google API Services User Data Policy
          </External>
          , including the Limited Use requirements. Google user data is used only to provide Ascent's features to you. It
          isn't used for advertising, isn't sold or shared with anyone else, isn't read by people, and isn't used to develop,
          improve or train artificial intelligence or machine-learning models.
        </p>
        <p>
          You can remove Ascent's access at any time in your Google Account under{' '}
          <External href="https://myaccount.google.com/connections">Third-party apps and services</External>. Your files stay
          in your Drive until you delete them.
        </p>
      </section>

      <section>
        <h2>Other services Ascent uses</h2>
        <ul>
          <li>
            <strong>Google sign-in.</strong> When accounts are available, Ascent loads Google's sign-in script from{' '}
            <code>accounts.google.com</code>. Google's handling of that is covered by the{' '}
            <External href="https://policies.google.com/privacy">Google Privacy Policy</External>.
          </li>
          <li>
            <strong>YouTube how-to videos.</strong> When you open a skill or a workout, video thumbnails load from YouTube's
            image servers. The video player only loads, in YouTube's privacy-enhanced mode (<code>youtube-nocookie.com</code>),
            when you press play, or when you follow a guided workout, which plays a muted demo of each exercise (you can turn
            demo videos off in Settings). From then on YouTube may collect information as described in the{' '}
            <External href="https://policies.google.com/privacy">Google Privacy Policy</External>.
          </li>
          <li>
            <strong>Workout announcer.</strong> In guided workouts, announcements are read out by your browser's built-in
            speech feature. Ascent picks a voice that runs on your device when there is one; if your browser only has online
            voices, the short announcement text (such as "Rest for 2 minutes") may be processed by your browser's speech
            service. You can turn the announcer off in Settings.
          </li>
          <li>
            <strong>Website hosting.</strong> The service that hosts Ascent's website may keep standard server logs, such as
            IP addresses and the pages requested, to deliver and protect the site.
          </li>
        </ul>
        <p>The photos in the app are bundled with it, so viewing them doesn't contact anyone else.</p>
      </section>

      <section>
        <h2>Health information</h2>
        <p>
          Body weight and workout history are personal. Ascent keeps them only in your browser and, if you sign in, your own
          Google Drive, and doesn't share them with anyone. Calorie figures are rough estimates based on standard activity
          values and the weight you log.
        </p>
      </section>

      <section>
        <h2>Notifications</h2>
        <p>
          If you turn on streak reminders, your browser shows them. They're created on your device from your own data, with no
          push server involved. You can turn them off in Settings or in your browser's site settings.
        </p>
      </section>

      <section>
        <h2>Your choices</h2>
        <ul>
          <li>
            <strong>Export:</strong> Settings → Export backup downloads all your progress as a file.
          </li>
          <li>
            <strong>Delete:</strong> Settings → Reset all progress clears it from this device (and from your Drive if you're
            signed in). Signing out removes the copy on this device. You can also delete the Ascent folder in your Google
            Drive, or clear this site's data in your browser.
          </li>
          <li>
            <strong>Disconnect Google:</strong> sign out in Settings, and remove Ascent in your Google Account's third-party
            access settings.
          </li>
        </ul>
      </section>

      <section>
        <h2>How long data is kept</h2>
        <p>
          Your data stays until you delete it. Files Ascent removes from your Drive go to your Drive trash, which Google empties
          after 30 days.
        </p>
      </section>

      <section>
        <h2>Security</h2>
        <p>
          Data sent to Google always uses an encrypted connection. Data on your device is protected by your browser and device,
          so anyone who can use your browser profile can see it. Sign out when you're finished on a shared device.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>Ascent isn't directed at children under 13 and doesn't knowingly collect information from them.</p>
      </section>

      <section>
        <h2>Changes to this policy</h2>
        <p>
          If this policy changes, the date at the top will change too. Significant changes will be pointed out in the app.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <Contact />
      </section>
    </LegalLayout>
  );
}

export function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      other="privacy"
      intro={
        <>
          <h2>The short version</h2>
          <ul>
            <li>Ascent is free to use and is provided as it is.</li>
            <li>It isn't medical advice. Exercise is at your own risk, so train within your limits.</li>
            <li>Your data belongs to you, and you're responsible for keeping a backup.</li>
          </ul>
        </>
      }
    >
      <section>
        <h2>1. Agreeing to these terms</h2>
        <p>
          By using Ascent you agree to these terms and to the <a href="#/privacy">Privacy Policy</a>. If you don't agree,
          please don't use the app.
        </p>
      </section>

      <section>
        <h2>2. The service</h2>
        <p>
          Ascent helps you plan and track bodyweight training. It's free. Features may change, and the app may be updated,
          paused or discontinued at any time.
        </p>
      </section>

      <section>
        <h2>3. Health and safety</h2>
        <p>
          <strong>Ascent provides general fitness information, not medical advice.</strong> Talk to a doctor before starting a
          new exercise program, especially if you have an injury, a health condition, or are pregnant.
        </p>
        <ul>
          <li>Warm up, use good form, and stop immediately if you feel pain, dizziness or shortness of breath.</li>
          <li>
            Progressions, targets, workout plans and calorie figures are general guidance and estimates. They aren't tailored
            to your body or health.
          </li>
          <li>
            Advanced skills (such as handstands, planches and levers) and weighted exercises carry a higher risk of injury. Use
            sturdy equipment, train on a safe surface, and progress gradually.
          </li>
        </ul>
        <p>You are responsible for your own safety, and you exercise at your own risk.</p>
      </section>

      <section>
        <h2>4. Accounts</h2>
        <p>
          Signing in with Google is optional. You're responsible for keeping your Google account secure, and Google's own
          terms apply to your use of Google services, including Google Drive.
        </p>
      </section>

      <section>
        <h2>5. Your data</h2>
        <p>
          The progress you record belongs to you. It's stored in your browser and, if you sign in, your own Google Drive.
          Because Ascent has no server of its own, it can't recover data that has been deleted from your device or Drive, so
          use Settings → Export backup if you want an extra copy.
        </p>
      </section>

      <section>
        <h2>6. Acceptable use</h2>
        <p>
          Don't use Ascent to break the law or infringe anyone's rights, and don't try to disrupt it, misuse the Google
          services it connects to, or access data that isn't yours.
        </p>
      </section>

      <section>
        <h2>7. Third-party content and services</h2>
        <p>
          How-to videos are hosted by YouTube, belong to their creators, and are covered by{' '}
          <External href="https://www.youtube.com/t/terms">YouTube's Terms of Service</External>. Photos are from Unsplash and
          used under the <External href="https://unsplash.com/license">Unsplash License</External>. Links to other websites
          aren't controlled by Ascent, which isn't responsible for their content.
        </p>
      </section>

      <section>
        <h2>8. Ownership</h2>
        <p>
          Ascent's design, code and written content belong to its developer, except third-party content and anything released
          under an open-source license. You may use the app for your own personal training.
        </p>
      </section>

      <section>
        <h2>9. Disclaimer</h2>
        <p>
          Ascent is provided "as is" and "as available", without warranties of any kind, express or implied, including
          fitness for a particular purpose, accuracy and uninterrupted availability, to the extent the law allows.
        </p>
      </section>

      <section>
        <h2>10. Limitation of liability</h2>
        <p>
          To the fullest extent the law allows, the developer isn't liable for any injury, loss of data, or indirect,
          incidental or consequential damages arising from your use of Ascent or the exercises it describes. Nothing in these
          terms limits liability that can't be limited by law.
        </p>
      </section>

      <section>
        <h2>11. Changes and ending</h2>
        <p>
          These terms may be updated; the date at the top shows the latest version, and continuing to use Ascent after a change
          means you accept it. You can stop using Ascent at any time and delete your data as described in the Privacy Policy.
        </p>
      </section>

      <section>
        <h2>12. Contact</h2>
        <Contact />
      </section>
    </LegalLayout>
  );
}
