declare module 'speakeasy' {
  export namespace totp {
    function verify(options: {
      secret: string
      encoding: string
      token: string
      window?: number
    }): boolean
  }
  function totp(options: {
    secret: string
    encoding: string
    step?: number
  }): string
}

declare module 'uuid' {
  export function v4(): string
}
