import * as authSchema from "./auth-schema.ts";
import * as appSchema from "./schema.ts";

export const schema = { ...appSchema, ...authSchema };

export * from "./auth-schema.ts";
export * from "./schema.ts";
