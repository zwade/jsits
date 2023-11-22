
export type Keywords = {
    "return": "ret",
    "let": "declare",
    "const": "declare",
    "var": "declare",
    "if": "conditional",
    "else": "antecedent",
}

export type BinOps = {
    "+": "binop",
    "-": "binop",
    "*": "binop",
    "/": "binop",
    "==": "binop"
    "===": "binop",
    ">": "binop",
    "<": "binop",
    ">=": "binop",
    "<=": "binop",
    "||": "binop",
    "&&": "binop",
}

export type Symbols = {
    "(": "open-paren",
    ")": "close-paren",
    "{": "open-brace",
    "}": "close-brace",
    ",": "comma",
    ";": "semicolon",
    "=>": "arrow",
    "=": "assignment",
}

export type Values = {
    [K: `${number}`]: "digit",
    [K: `"${string}"`]: "string",
    [K: `'${string}'`]: "string",
    "true": "bool",
    "false": "bool",
}


export type Whitespace = {
    " ": "space",
    "\t": "space",
    "\n": "space",
}

export type LexTokenMap = (
    & Keywords
    & BinOps
    & Symbols
    & Whitespace
    & Values
);

export type LexTokenKeys = keyof LexTokenMap;
export type LexTokenValues = LexTokenMap[LexTokenKeys] | "token";
export type Tok = [string, LexTokenValues];
