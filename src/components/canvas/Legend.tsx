export function Legend() {
  return (
    <div className="legend">
      <div className="legend__title">Legend</div>
      <div className="legend__row"><div className="legend__line" />rdfs:subClassOf</div>
      <div className="legend__row"><div className="legend__line legend__line--object" />owl:ObjectProperty</div>
      <div className="legend__row"><div className="legend__line legend__line--datatype" />owl:DatatypeProperty</div>
      <div className="legend__row">
        <div className="legend__class" />Class · <div className="legend__literal" />Literal
      </div>
    </div>
  );
}
