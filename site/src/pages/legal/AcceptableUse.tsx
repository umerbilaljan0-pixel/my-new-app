import { Prose } from "@/components/Prose";

export default function AcceptableUse() {
  return (
    <Prose title="Acceptable Use" updated="2026-09-05">
      <p>
        CLEANPLATE is a restoration suite. It exists to repair, upscale, reframe and clean material that
        <strong> you own or are licensed to modify</strong>. The following rules are not optional and are
        enforced by the software.
      </p>

      <h2>Ownership and licence</h2>
      <p>
        On first launch, and again in every export dialog, CLEANPLATE requires you to confirm that you own
        or hold a licence to the material you are processing. Each confirmation is logged locally with a
        timestamp. Jobs are refused until ownership is confirmed.
      </p>

      <h2>Copyright, credit and provenance marks</h2>
      <p>
        <strong>
          Stripping copyright, credit or provenance marks from third-party material is unlawful in most
          jurisdictions, regardless of the tool used.
        </strong>{" "}
        This includes visible copyright notices, attribution and bylines, and embedded provenance
        signatures. Do not use CLEANPLATE to remove them from material you do not own.
      </p>

      <h2>Provenance signatures are out of scope, by design</h2>
      <p>
        CLEANPLATE does <strong>not</strong> detect, target or defeat C2PA, SynthID or any similar
        provenance or content-authenticity signature. The auto-detect in ERASE operates purely on the
        visual characteristics of overlays (temporal stability, contrast, position). It is not trained or
        tuned against provenance watermarks, and we will not add a feature that does so.
      </p>

      <h2>Prohibited uses</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Removing watermarks, credits or provenance from third-party content you have no rights to.</li>
        <li>Defeating, obscuring or forging content-authenticity signals.</li>
        <li>Creating deceptive media intended to impersonate a real person or organisation.</li>
        <li>Any use unlawful in your jurisdiction.</li>
      </ul>

      <p>
        Violating these terms terminates your licence. If you are unsure whether you have the right to
        modify a piece of material, assume you do not.
      </p>
    </Prose>
  );
}
