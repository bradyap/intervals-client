export type ResourceRequestMethod = 'DELETE' | 'GET' | 'POST' | 'PUT';

export interface ResourceRequestBaseOptions {
  accept?: string;
  body?: RequestInit['body'];
  json?: unknown;
  method?: ResourceRequestMethod;
  pathSegments: string[];
  query?: URLSearchParams;
  signal?: AbortSignal;
}

export interface ResourceRequestOptions<ResponseBody> extends ResourceRequestBaseOptions {
  parse: (value: unknown) => ResponseBody;
  validationMessage: string;
}

export type ResourceRequester = <ResponseBody>(
  options: ResourceRequestOptions<ResponseBody>,
) => Promise<ResponseBody>;

export type ResourceBytesRequester = (options: ResourceRequestBaseOptions) => Promise<Uint8Array>;

export type ResourceVoidRequester = (options: ResourceRequestBaseOptions) => Promise<void>;
