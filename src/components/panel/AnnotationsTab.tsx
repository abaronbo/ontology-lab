import { useStore } from '../../model/StoreContext';
import type { EdgeField, NodeField } from '../../model/store';
import { customAnnotationKeys } from '../../model/derive';
import { XSD_DATATYPES, type OntoEdge, type OntoNode, type XsdDatatype } from '../../model/types';
import { Field, TextField } from '../ui/Field';

interface Props {
  node?: OntoNode;
  edge?: OntoEdge;
}

export function AnnotationsTab({ node, edge }: Props) {
  const { state, dispatch } = useStore();
  const { settings } = state;
  const prefix = settings.prefix || 'ex';
  const customKeys = customAnnotationKeys(settings.customAnnotations);
  const customFields = (target: 'node' | 'edge', id: string, values: Record<string, string> | undefined) =>
    customKeys.map((key) => (
      <TextField
        key={key}
        id={`f-custom-${key}`}
        label={key}
        value={values?.[key] ?? ''}
        onChange={(value) => dispatch({ type: 'setCustomAnnotation', target, id, key, value })}
      />
    ));

  if (node) {
    const set = (field: NodeField) => (value: string) => dispatch({ type: 'updateNode', id: node.id, field, value });
    if (node.type === 'class') {
      return (
        <div className="fields">
          <TextField id="f-iri" label="IRI" value={node.iri ?? ''} onChange={set('iri')} mono prefix={prefix} />
          <TextField id="f-label" label="rdfs:label" value={node.label} onChange={set('label')} />
          {settings.showPrefLabel && <TextField id="f-pref" label="skos:prefLabel" value={node.prefLabel ?? ''} onChange={set('prefLabel')} />}
          {settings.showAltLabel && (
            <TextField id="f-alt" label="skos:altLabel" value={node.altLabel ?? ''} onChange={set('altLabel')} placeholder="comma-separated synonyms" />
          )}
          {settings.showDefinition && <TextField id="f-def" label="skos:definition" value={node.definition ?? ''} onChange={set('definition')} rows={3} />}
          {settings.showComment && <TextField id="f-comment" label="rdfs:comment" value={node.comment ?? ''} onChange={set('comment')} rows={3} />}
          {customFields('node', node.id, node.custom)}
        </div>
      );
    }
    return (
      <div className="fields">
        <TextField id="f-label" label="rdfs:label" value={node.label} onChange={set('label')} />
        <Field label="Datatype" htmlFor="f-datatype">
          <select
            id="f-datatype"
            className="select"
            value={node.datatype ?? 'string'}
            onChange={(e) => dispatch({ type: 'setDatatype', id: node.id, datatype: e.target.value as XsdDatatype })}
          >
            {XSD_DATATYPES.map((d) => (
              <option key={d} value={d}>xsd:{d}</option>
            ))}
          </select>
        </Field>
      </div>
    );
  }

  if (!edge) return null;
  const set = (field: EdgeField) => (value: string) => dispatch({ type: 'updateEdge', id: edge.id, field, value });
  if (edge.kind === 'subClassOf') {
    return settings.showComment ? (
      <div className="fields">
        <TextField
          id="f-comment"
          label="rdfs:comment"
          value={edge.comment ?? ''}
          onChange={set('comment')}
          rows={3}
          placeholder="Optional note about this hierarchy relation"
        />
      </div>
    ) : null;
  }
  return (
    <div className="fields">
      <TextField id="f-iri" label="IRI" value={edge.iri ?? ''} onChange={set('iri')} mono prefix={prefix} />
      <TextField id="f-label" label="rdfs:label" value={edge.label ?? ''} onChange={set('label')} />
      {settings.showPrefLabel && <TextField id="f-pref" label="skos:prefLabel" value={edge.prefLabel ?? ''} onChange={set('prefLabel')} />}
      {settings.showAltLabel && (
        <TextField id="f-alt" label="skos:altLabel" value={edge.altLabel ?? ''} onChange={set('altLabel')} placeholder="comma-separated synonyms" />
      )}
      {settings.showDefinition && <TextField id="f-def" label="skos:definition" value={edge.definition ?? ''} onChange={set('definition')} rows={2} />}
      {settings.showComment && <TextField id="f-comment" label="rdfs:comment" value={edge.comment ?? ''} onChange={set('comment')} rows={2} />}
      {customFields('edge', edge.id, edge.custom)}
    </div>
  );
}
