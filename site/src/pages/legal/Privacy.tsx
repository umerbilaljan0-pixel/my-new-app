import { Prose } from "@/components/Prose";

export default function Privacy() {
  return (
    <Prose title="Privacy Policy" updated="2026-09-05">
      <p>
        CLEANPLATE is built so that <strong>your footage never leaves your machine</strong>. This policy
        explains the little data that does and does not move.
      </p>
      <h2>Media you process</h2>
      <p>
        Never uploaded. In the desktop and self-hosted builds, all frames are read and written on the
        machine running the engine. Originals are never modified; outputs are written to a local directory.
      </p>
      <h2>Rights confirmations</h2>
      <p>
        Your ownership confirmations are logged locally with a timestamp so you have a record. They are not
        transmitted to us in the desktop or self-hosted builds.
      </p>
      <h2>Account data (hosted plans only)</h2>
      <p>
        If you use the hosted web service, we store the minimum needed to run your account: email, plan and
        credit balance, and — for Studio — API keys and team membership. Authentication uses a magic link or
        Google, with a JWT in an httpOnly cookie. We do not sell your data.
      </p>
      <h2>Model downloads</h2>
      <p>
        Model weights are fetched from their upstream sources on first use and cached locally. These
        requests reveal only which models you downloaded, to the host serving them.
      </p>
    </Prose>
  );
}
