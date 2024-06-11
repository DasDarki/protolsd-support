export interface ScriptPackage {
  path: string;
  name: string;
  areImportsPrivate: boolean;
  parent?: ScriptPackage;
  scripts: { [key: string]: Script };
  packages: { [key: string]: ScriptPackage };
}

export interface Script {
  package?: ScriptPackage;
  path: string;
  areImportsPrivate: boolean;
  usedEmptyResponse: boolean;
  usedEmptyRequest: boolean;
  imports: ImportStatement[];
  typeAliases: { [key: string]: string };
  declaredTypes: { [key: string]: boolean };
  enums: { [key: string]: Enum };
  messages: { [key: string]: Message };
  services: { [key: string]: Service };
  accessibleScripts?: Script[];
}

export interface ImportStatement {
  path: string;
  private: boolean;
}

export interface Enum {
  name: string;
  isClass: boolean;
  constants: { [key: string]: number };
}

export interface Message {
  name: string;
  fields: { [key: string]: MessageField };
  children: { [key: string]: Message };
}

export interface MessageField {
  name: string;
  dataType: DataType;
  order: number;
  modifier?: string;
  overwrite: boolean;
}

export interface DataType {
  identifier: string;
  isOptional: boolean;
  isArray: boolean;
}

export interface Service {
  name: string;
  rpcs: { [key: string]: RpcMethod };
}

export interface RpcMethod {
  name: string;
  returns?: RpcMethodMessage;
  input?: RpcMethodMessage;
}

export interface RpcMethodMessage {
  needsAutoWire: boolean;
  name?: string;
  message?: Message;
}