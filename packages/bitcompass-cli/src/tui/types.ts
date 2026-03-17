export interface TuiArg {
  name: string;
  required: boolean;
  placeholder?: string;
}

export interface TuiOption {
  flags: string;
  type: 'boolean' | 'string';
  placeholder?: string;
  description?: string;
}

export interface TuiCommand {
  /** Display label, e.g. "rules search [query]" */
  label: string;
  /** Description shown in preview pane */
  description: string;
  /** argv tokens prepended before user-supplied args, e.g. ['rules', 'search'] */
  baseArgv: string[];
  args?: TuiArg[];
  options?: TuiOption[];
  /** Hide the global --global / --copy / etc. options */
  hideGlobalOptions?: boolean;
  /** Optional inline view component key for special rendering */
  inlineView?: string;
}

export interface TuiCommandGroup {
  label: string;
  commands: TuiCommand[];
}

export interface TuiTheme {
  name: string;
  subtitle: string;
  gradient: [string, string];
  accent: string;
  accentSecondary: string;
}
