import { isValidCurie } from '../../model/derive';
import { useStore } from '../../model/StoreContext';
import type { PrefixEntry, Settings } from '../../model/types';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { Modal } from './Modal';

const TOGGLES: { key: keyof Pick<Settings, 'showPrefLabel' | 'showAltLabel' | 'showDefinition' | 'showComment'>; label: string }[] = [
  { key: 'showPrefLabel', label: 'skos:prefLabel' },
  { key: 'showAltLabel', label: 'skos:altLabel' },
  { key: 'showDefinition', label: 'skos:definition' },
  { key: 'showComment', label: 'rdfs:comment' },
];

function replaceAt<T>(list: T[], index: number, item: T): T[] {
  return list.map((x, i) => (i === index ? item : x));
}
function removeAt<T>(list: T[], index: number): T[] {
  return list.filter((_, i) => i !== index);
}

export function SettingsDialog() {
  const { state, dispatch } = useStore();
  const { settings } = state;
  const close = () => dispatch({ type: 'setSettingsOpen', open: false });
  const patch = (p: Partial<Settings>) => dispatch({ type: 'updateSettings', patch: p });
  const setPrefixes = (extraPrefixes: PrefixEntry[]) => patch({ extraPrefixes });
  const setAnnotations = (customAnnotations: string[]) => patch({ customAnnotations });

  return (
    <Modal className="modal--settings" onClose={close}>
      <div className="modal__header"><div className="modal__title">Settings</div></div>
      <div className="modal__body">
        <section>
          <div className="section-heading">Namespace</div>
          <div className="settings__namespace">
            <Field label="Prefix" htmlFor="s-prefix" plain className="settings__prefix">
              <input id="s-prefix" className="input input--mono" value={settings.prefix} onChange={(e) => patch({ prefix: e.target.value })} />
            </Field>
            <Field label="Base IRI" htmlFor="s-namespace" plain className="settings__base">
              <input id="s-namespace" className="input input--mono" value={settings.namespace} onChange={(e) => patch({ namespace: e.target.value })} />
            </Field>
          </div>
        </section>

        <section>
          <div className="section-heading">Additional prefixes</div>
          <div className="settings__list">
            {settings.extraPrefixes.map((entry, i) => (
              <div className="settings__row" key={i}>
                <input
                  className="input input--mono settings__prefix"
                  placeholder="dcterms"
                  aria-label={`Prefix ${i + 1}`}
                  value={entry.prefix}
                  onChange={(e) => setPrefixes(replaceAt(settings.extraPrefixes, i, { ...entry, prefix: e.target.value }))}
                />
                <input
                  className="input input--mono settings__wide"
                  placeholder="http://purl.org/dc/terms/"
                  aria-label={`IRI ${i + 1}`}
                  value={entry.iri}
                  onChange={(e) => setPrefixes(replaceAt(settings.extraPrefixes, i, { ...entry, iri: e.target.value }))}
                />
                <Button variant="label" className="btn--icon" aria-label={`Remove prefix ${i + 1}`} title="Remove" onClick={() => setPrefixes(removeAt(settings.extraPrefixes, i))}>
                  ×
                </Button>
              </div>
            ))}
            {settings.extraPrefixes.length === 0 && (
              <div className="settings__empty">rdf, rdfs, owl, skos and xsd are always declared. Add any others you need here.</div>
            )}
            <Button variant="outlined" className="settings__add" aria-label="Add prefix" onClick={() => setPrefixes([...settings.extraPrefixes, { prefix: '', iri: '' }])}>
              + Prefix
            </Button>
          </div>
        </section>

        <section>
          <div className="section-heading">Additional annotation properties</div>
          <div className="settings__list">
            {settings.customAnnotations.map((curie, i) => {
              const bad = curie.trim() !== '' && !isValidCurie(curie);
              return (
                <div className="settings__row" key={i}>
                  <input
                    className="input input--mono settings__wide"
                    placeholder="dcterms:created"
                    aria-label={`Annotation property ${i + 1}`}
                    aria-invalid={bad || undefined}
                    title={bad ? 'Enter a prefix:name pair' : undefined}
                    value={curie}
                    onChange={(e) => setAnnotations(replaceAt(settings.customAnnotations, i, e.target.value))}
                  />
                  <Button variant="label" className="btn--icon" aria-label={`Remove annotation property ${i + 1}`} title="Remove" onClick={() => setAnnotations(removeAt(settings.customAnnotations, i))}>
                    ×
                  </Button>
                </div>
              );
            })}
            {settings.customAnnotations.length === 0 && (
              <div className="settings__empty">Each property you add here becomes a text field on classes and properties and is written to the export.</div>
            )}
            <Button variant="outlined" className="settings__add" aria-label="Add annotation property" onClick={() => setAnnotations([...settings.customAnnotations, ''])}>
              + Annotation property
            </Button>
          </div>
        </section>

        <section>
          <div className="section-heading">Annotation template</div>
          <div className="settings__checks">
            <label className="settings__check settings__check--disabled">
              <input type="checkbox" className="checkbox" checked disabled readOnly />
              rdfs:label (always shown)
            </label>
            {TOGGLES.map((t) => (
              <label key={t.key} className="settings__check">
                <input type="checkbox" className="checkbox" checked={settings[t.key]} onChange={(e) => patch({ [t.key]: e.target.checked })} />
                {t.label}
              </label>
            ))}
          </div>
        </section>
      </div>
      <div className="modal__footer">
        <Button variant="primary" onClick={close}>Done</Button>
      </div>
    </Modal>
  );
}
