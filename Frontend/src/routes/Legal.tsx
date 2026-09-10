const content = {
  'Privacy Policy': {
    effective: 'Effective 7 September 2026',
    sections: [
      {
        h: 'Purpose',
        p: 'This clinical dashboard presents app-derived monitoring information for authorized clinicians. It does not diagnose a patient or confirm an emergency.',
      },
      {
        h: 'Health-data handling',
        p: 'Access is limited to authorized care-team workflows. Monitoring data, session results, and protected audio are available only to clinicians assigned to the patient by clinic policy. Audit records are kept for authorized access, alert actions, and export requests.',
      },
      {
        h: 'Data retention and requests',
        p: 'This mock frontend contains de-identified fixture data only. In production, data-retention periods follow clinic policy and applicable health-data regulation. Contact the clinic privacy office for requests or concerns.',
      },
      {
        h: 'Contact',
        p: 'SIH26003 Clinical Operations, North Clinic. privacy@sih26003.example',
      },
    ],
  },
  'Terms of Service': {
    effective: 'Effective 7 September 2026',
    sections: [
      {
        h: 'Permitted use',
        p: 'The dashboard is licensed to clinic staff for assigned-patient monitoring workflows. Accounts are personal; credential sharing is not permitted.',
      },
      {
        h: 'Clinical limitations',
        p: 'All monitoring views are informational. Welfare alerts request human verification and are not proof of an emergency. No dashboard content substitutes for clinical judgment.',
      },
      {
        h: 'Availability',
        p: 'The service may be unavailable during maintenance. Data shown may be incomplete while devices await synchronization; incomplete data is always labeled.',
      },
      {
        h: 'Contact',
        p: 'SIH26003 Clinical Operations, North Clinic. terms@sih26003.example',
      },
    ],
  },
} as const;

export function Legal({ kind }: { kind: 'Privacy Policy' | 'Terms of Service' }) {
  const doc = content[kind];
  return (
    <main className="legal">
      <a href="#/overview">Back to dashboard</a> | <a href="#/login">Sign in</a>
      <h1>{kind}</h1>
      <p>{doc.effective} · SIH26003 Cognitive Care, Monitoring and Welfare Platform · Version 1.0</p>
      {doc.sections.map((s) => (
        <section key={s.h}>
          <h2>{s.h}</h2>
          <p>{s.p}</p>
        </section>
      ))}
    </main>
  );
}
