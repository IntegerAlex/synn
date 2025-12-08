declare module 'react-cytoscapejs' {
  import { Component } from 'react';
  import type { Core, Stylesheet, ElementDefinition, LayoutOptions } from 'cytoscape';

  export interface CytoscapeComponentProps {
    elements: ElementDefinition[];
    style?: React.CSSProperties;
    stylesheet?: Stylesheet | Stylesheet[];
    layout?: LayoutOptions;
    cy?: (cy: Core) => void;
    className?: string;
    id?: string;
  }

  export default class CytoscapeComponent extends Component<CytoscapeComponentProps> {}

  export function getCytoscape(): typeof import('cytoscape') | null;
}

