export interface ImportInfo {
  url: string
  name: string
}

export interface QueryParameter {
  name: string
  default: string
}

export interface Query {
  _id?: string
  datasourceId: string
  name: string
  parameters: QueryParameter[]
  fields: {
    headers: object
    queryString: string | null
    path: string
    requestBody?: object
  }
  transformer: string | null
  schema: any
  readable: boolean
  queryVerb: string
}

enum MethodToVerb {
  get = "read",
  post = "create",
  put = "update",
  patch = "patch",
  delete = "delete",
}

export abstract class ImportSource {

  abstract isSupported(data: string): Promise<boolean>
  abstract getInfo(): Promise<ImportInfo>
  abstract getQueries(datasourceId: string): Promise<Query[]>

  constructQuery = (
    datasourceId: string,
    name: string,
    method: string,
    path: string,
    queryString: string,
    headers: object = {},
    parameters: QueryParameter[] = [],
    requestBody: object | undefined = undefined,
  ): Query => {
    const readable = true
    const queryVerb = this.verbFromMethod(method)
    const transformer = "return data"
    const schema = {}
    path = this.processPath(path)
  
    const query: Query = {
      datasourceId,
      name,
      parameters,
      fields: {
        headers,
        queryString,
        path,
        requestBody
      },
      transformer,
      schema,
      readable,
      queryVerb,
    }
  
    return query
  }

  verbFromMethod = (method: string) => {
    const verb = (<any>MethodToVerb)[method]
    if (!verb) {
      throw new Error(`Unsupported method: ${method}`)
    }
    return verb
  }

  processPath = (path: string): string => {
    if (path?.startsWith("/")) {
      return path.substring(1)
    }
  
    return path
  }
}
