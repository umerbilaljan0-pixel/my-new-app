import { Prose } from "@/components/Prose";

export default function Terms() {
  return (
    <Prose title="Terms of Service" updated="2026-09-05">
      <p>
        These terms govern use of the CLEANPLATE web service and desktop application. By using CLEANPLATE
        you agree to them and to the <strong>Acceptable Use</strong> policy, which is incorporated here by
        reference.
      </p>
      <h2>Licence</h2>
      <p>
        The desktop build is sold as a perpetual licence, offline-activatable, valid on up to three
        machines. The web service is offered on Free, Pro and Studio plans. We grant you a non-exclusive,
        non-transferable right to use the software subject to these terms.
      </p>
      <h2>Your content</h2>
      <p>
        You retain all rights to the material you process. CLEANPLATE processes it on the machine running
        the engine; in the desktop and self-hosted builds nothing is transmitted to us. You are solely
        responsible for holding the rights to the material you modify.
      </p>
      <h2>Credits and billing</h2>
      <p>
        Web plans use a credit model — 1 credit equals 1 image or 10 seconds of 1080p video, scaling with
        resolution. Free includes 30 credits per month with a visible output watermark. Paid plans renew
        until cancelled. Desktop licences are one-time purchases.
      </p>
      <h2>Warranty and liability</h2>
      <p>
        The software is provided “as is”, without warranty of any kind. To the maximum extent permitted by
        law, we are not liable for indirect or consequential damages arising from its use.
      </p>
    </Prose>
  );
}
