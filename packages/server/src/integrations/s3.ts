import {
  Integration,
  QueryType,
  IntegrationBase,
  DatasourceFieldType,
} from "@budibase/types"

module S3Module {
  const AWS = require("aws-sdk")
  const csv = require("csvtojson")

  interface S3Config {
    region: string
    accessKeyId: string
    secretAccessKey: string
    s3ForcePathStyle: boolean
    endpoint?: string
  }

  const SCHEMA: Integration = {
    docs: "https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html",
    description:
      "Amazon Simple Storage Service (Amazon S3) is an object storage service that offers industry-leading scalability, data availability, security, and performance.",
    friendlyName: "Amazon S3",
    type: "Object store",
    datasource: {
      region: {
        type: "string",
        required: false,
        default: "us-east-1",
      },
      accessKeyId: {
        type: "password",
        required: true,
      },
      secretAccessKey: {
        type: "password",
        required: true,
      },
      endpoint: {
        type: "string",
        required: false,
      },
      signatureVersion: {
        type: "string",
        required: false,
        default: "v4",
      },
    },
    query: {
      create: {
        type: QueryType.FIELDS,
        fields: {
          bucket: {
            display: "New Bucket",
            type: DatasourceFieldType.STRING,
            required: true,
          },
          location: {
            required: true,
            default: "us-east-1",
            type: DatasourceFieldType.STRING,
          },
          grantFullControl: {
            display: "Grant full control",
            type: DatasourceFieldType.STRING,
          },
          grantRead: {
            display: "Grant read",
            type: DatasourceFieldType.STRING,
          },
          grantReadAcp: {
            display: "Grant read ACP",
            type: DatasourceFieldType.STRING,
          },
          grantWrite: {
            display: "Grant write",
            type: DatasourceFieldType.STRING,
          },
          grantWriteAcp: {
            display: "Grant write ACP",
            type: DatasourceFieldType.STRING,
          },
        },
      },
      read: {
        type: QueryType.FIELDS,
        fields: {
          bucket: {
            type: DatasourceFieldType.STRING,
            required: true,
          },
          delimiter: {
            type: DatasourceFieldType.STRING,
          },
          marker: {
            type: DatasourceFieldType.STRING,
          },
          maxKeys: {
            type: DatasourceFieldType.NUMBER,
            display: "Max Keys",
          },
          prefix: {
            type: DatasourceFieldType.STRING,
          },
        },
      },
      readCsv: {
        displayName: "Read CSV",
        type: QueryType.FIELDS,
        fields: {
          bucket: {
            type: DatasourceFieldType.STRING,
            required: true,
          },
          key: {
            type: DatasourceFieldType.STRING,
            required: true,
          },
        },
      },
    },
    extra: {
      acl: {
        required: false,
        displayName: "ACL",
        type: DatasourceFieldType.LIST,
        data: {
          create: [
            "private",
            "public-read",
            "public-read-write",
            "authenticated-read",
          ]
        }
      },
      objectOwnership: {
        required: false,
        displayName: "Object ownership",
        type: DatasourceFieldType.LIST,
        data: {
          create: [
            "BucketOwnerPreferred",
            "ObjectWriter",
            "BucketOwnerEnforced",
          ],
        },
      },
    }
  }

  class S3Integration implements IntegrationBase {
    private readonly config: S3Config
    private client: any

    constructor(config: S3Config) {
      this.config = config
      if (this.config.endpoint) {
        this.config.s3ForcePathStyle = true
      } else {
        delete this.config.endpoint
      }

      this.client = new AWS.S3(this.config)
    }

    async create(query: {
      bucket: string,
      location: string,
      grantFullControl: string,
      grantRead: string,
      grantReadAcp: string,
      grantWrite: string,
      grantWriteAcp: string,
      extra: {
        acl: string,
        objectOwnership: string,
      }}) {
      const response = await this.client.createBucket({
        Bucket: query.bucket,
        // ACL: query.extra?.acl,
        CreateBucketConfiguration: {
          LocationConstraint: query.location
        },
        GrantFullControl: query.grantFullControl,
        GrantRead: query.grantRead,
        GrantReadACP: query.grantReadAcp,
        GrantWrite: query.grantWrite,
        GrantWriteACP: query.grantWriteAcp,
      }, (err: any) => {
        console.log("ERR ", err)
      })
      .promise()
      return response.Contents
    }

    async read(query: {
      bucket: string
      delimiter: string
      expectedBucketOwner: string
      marker: string
      maxKeys: number
      prefix: string
    }) {
      const response = await this.client
        .listObjects({
          Bucket: query.bucket,
          Delimiter: query.delimiter,
          Marker: query.marker,
          MaxKeys: query.maxKeys,
          Prefix: query.prefix,
        })
        .promise()
      return response.Contents
    }

    async readCsv(query: { bucket: string; key: string }) {
      const stream = this.client
        .getObject({
          Bucket: query.bucket,
          Key: query.key,
        })
        .createReadStream()

      let csvError = false
      return new Promise((resolve, reject) => {
        stream.on("error", (err: Error) => {
          reject(err)
        })
        const response = csv()
          .fromStream(stream)
          .on("error", () => {
            csvError = true
          })
        stream.on("finish", () => {
          resolve(response)
        })
      }).catch(err => {
        if (csvError) {
          throw new Error("Could not read CSV")
        } else {
          throw err
        }
      })
    }
  }

  module.exports = {
    schema: SCHEMA,
    integration: S3Integration,
  }
}
