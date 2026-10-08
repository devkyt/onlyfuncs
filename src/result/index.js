export const ok = (value) => ({ type: "ok", value: value });


export const isOk = (result) => result.type === "ok";


export const err = (error) => ({ type: "err", error: error });


export const isErr = (result) => result.type === "err";


