export interface ResourceRequestOptions<ResponseBody> {
  pathSegments: string[];
  query?: URLSearchParams;
  signal?: AbortSignal;
  parse: (value: unknown) => ResponseBody;
  validationMessage: string;
}

export type ResourceRequester = <ResponseBody>(
  options: ResourceRequestOptions<ResponseBody>,
) => Promise<ResponseBody>;
