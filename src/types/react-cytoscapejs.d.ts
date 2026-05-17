declare module "react-cytoscapejs" {
  import type {
    Core,
    ElementDefinition,
    LayoutOptions,
    Stylesheet,
  } from "cytoscape";
  import { Component } from "react";

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

  export function getCytoscape(): typeof import("cytoscape") | null;
}
