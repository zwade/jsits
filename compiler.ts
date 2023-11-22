/*** Maffs stuff */

type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type FromDigit<T extends string> = T extends `${infer X extends number}` ? X : never;

type Reverse<T, A extends T[]> = A extends [infer Head, ...(infer Tail)] ? Tail extends T[] ? [...Reverse<T, Tail>, Head] : never : [];
type FromInt<I extends number, acc extends unknown[] = []> = acc["length"] extends I ? acc : FromInt<I, [...acc, null]>
type ToInt<A extends unknown[]> = A["length"]

type Add<D1 extends number, D2 extends number> = ToInt<[...FromInt<D1>, ...FromInt<D2>]>
type Mult_<A1 extends unknown[], A2 extends unknown[], Acc extends unknown[] = []> = A1 extends [any, ...(infer Tail extends unknown[])] ?
    Mult_<Tail, A2, [...Acc, ...A2]> :
    Acc;
type Mult<A1 extends number, A2 extends number> = ToInt<Mult_<FromInt<A1>, FromInt<A2>>>;

type IsNumber<N> = N extends number ? N : never;

type Decompose_<T extends string, Acc extends number[] = []> = T extends `${infer D extends Digit}${infer Rest}` ? Decompose_<Rest, [...Acc, FromDigit<D>]> : Acc;
type Decompose<T extends number> = Reverse<number, Decompose_<`${T}`>>;
type Recompose_<T extends number[]> =
    T extends [(infer D extends number), ...(infer R extends number[])] ?
        `${Recompose_<R>}${D}` :
    "";
type StripLeading0s<T extends string> = T extends `0${infer R}` ? StripLeading0s<R> : T;
type Recompose<T extends number[]> = StripLeading0s<Recompose_<T>> extends `${infer N extends number}` ? N : never;

type AddC<D1 extends number, D2 extends number> = Decompose<IsNumber<Add<D1, D2>>>
type BigAdd_<N1 extends number[], N2 extends number[]> =
    N1 extends [infer D1 extends number, ...(infer R1 extends number[])] ?
        N2 extends [infer D2 extends number, ...(infer R2 extends number[])] ?
            AddC<D1, D2> extends [infer D extends number, ...(infer R extends number[])] ?
                [D, ...BigAdd_<BigAdd_<R, R1>, R2>] :
            never :
        N1 :
    N2;

export type BigAdd<N1 extends number, N2 extends number> = Recompose<BigAdd_<Decompose<N1>, Decompose<N2>>>

type MultC<D1 extends number, D2 extends number> = Decompose<IsNumber<Mult<D1, D2>>>
type BigMult1D_<D1 extends number, N2 extends number[]> =
    N2 extends [infer D2 extends number, ...(infer R2 extends number[])] ?
        MultC<D1, D2> extends [infer D extends number, ...(infer R extends number[])] ?
            [D, ...BigAdd_<BigMult1D_<D1, R2>, R>] :
        never :
    [0]
type BigMult_<N1 extends number[], N2 extends number[]> =
    N1 extends [infer D1 extends number, ...(infer R1 extends number[])] ?
        BigAdd_<BigMult1D_<D1, N2>, [0, ...BigMult_<R1, N2>]> :
    [0]


export type BigMult<N1 extends number, N2 extends number> = Recompose<BigMult_<Decompose<N1>, Decompose<N2>>>;

/* Compiler stuffs */

type Keywords = {
    "return": "ret",
    "let": "declare",
    "const": "declare",
    "var": "declare",
    "if": "conditional",
    "else": "antecedent",
}

type BinOps = {
    "+": "binop",
    "-": "binop",
    "*": "binop",
    "/": "binop",
    "==": "binop"
    "===": "binop",
}

type Symbols = {
    "(": "open-paren",
    ")": "close-paren",
    "{": "open-brace",
    "}": "close-brace",
    ",": "comma",
    ";": "semicolon",
    "=>": "arrow",
    "=": "assignment",
}

type Values = {
    [K: `${number}`]: "digit",
    [K: `"${string}"`]: "string",
    [K: `'${string}'`]: "string",
    "true": "bool",
    "false": "bool",
}


type Whitespace = {
    " ": "space",
    "\t": "space",
    "\n": "space",
}

type LexTokenMap = (
    & Keywords
    & BinOps
    & Symbols
    & Whitespace
    & Values
);

type LexTokenKeys = keyof LexTokenMap;
type LexTokenValues = LexTokenMap[LexTokenKeys] | "token";
type Tok = [string, LexTokenValues];

type AddIfNotEmpty<Tokens extends string[], Tok extends string> = Tok extends "" ? Tokens : [...Tokens, Tok]

type Tokenize<Text, CurrentToken extends string = "", Tokens extends string[] = []> =
    Text extends "" ? AddIfNotEmpty<Tokens, CurrentToken> :
    Text extends `${infer C extends string}${infer Rest}` ?
        CurrentToken extends `${infer Start extends "\"" | "'"}${string}` ?
            C extends `${Start}` ? Tokenize<Rest, "", AddIfNotEmpty<Tokens, `${CurrentToken}${C}`>> :
            Tokenize<Rest, `${CurrentToken}${C}`, Tokens> :
        C extends keyof Whitespace ? Tokenize<Rest, "", AddIfNotEmpty<Tokens, CurrentToken>> :
        C extends `${keyof BinOps | keyof Symbols}${string}` ?
            MaximallyTokenizeOperator<C, Rest> extends [infer NewToken extends string, infer NewRest] ?
                Tokenize<NewRest, "", AddIfNotEmpty<AddIfNotEmpty<Tokens, CurrentToken>, NewToken>> :
                never :
        Tokenize<Rest, `${CurrentToken}${C}`, Tokens> :
    never;

type MaximallyTokenizeOperator<C extends string, Rest extends string> =
    Rest extends `${infer C2 extends string}${infer NewRest}` ?
        `${C}${C2}` extends `${keyof BinOps | keyof Symbols}` ? MaximallyTokenizeOperator<`${C}${C2}`, NewRest> :
        [C, Rest] :
    [C, Rest];

type Lex<Tokens extends string[], Acc extends Tok[] = []> =
    Tokens extends [] ? Acc :
    Tokens extends [infer Head, ...infer Tail extends string[]] ?
        Head extends (infer Key extends LexTokenKeys) ? Lex<Tail, [...Acc, [Head, LexTokenMap[Key]]]> :
        Head extends string ? Lex<Tail, [...Acc, [Head, "token"]]> :
        never :
    never;

type ParseTree =
    | { kind: "expression", value: ParseTree }
    | { kind: "number-literal", value: number }
    | { kind: "string-literal", value: string }
    | { kind: "bool-literal", value: boolean }
    | { kind: "assignment-word" }
    | { kind: "declaration-word" }
    | { kind: "conditional-word" }
    | { kind: "antecedent-word" }
    | { kind: "semicolon" }
    | { kind: "open-brace" }
    | { kind: "close-brace" }
    | { kind: "open-paren" }
    | { kind: "close-paren" }
    | { kind: "return-word" }
    | { kind: "comma" }
    | { kind: "arrow" }
    | { kind: "arrow-fn", args: ParseTree[], body: ParseTree }
    | { kind: "fn-header", args: ParseTree[] }
    | { kind: "conditional-header", condition: ParseTree }
    | { kind: "conditional", condition: ParseTree, body: ParseTree }
    | { kind: "antecedent", condition: ParseTree, trueCase: ParseTree, falseCase: ParseTree }
    | { kind: "comma-series", values: ParseTree[] } // Could be declaration args, function calls, or use of the comma operator
    | { kind: "return", value: ParseTree }
    | { kind: "token", value: string }
    | { kind: "binop-word", value: keyof BinOps }
    | { kind: "call", fn: ParseTree, args: ParseTree[] }
    | { kind: "binop", op: keyof BinOps, left: ParseTree, right: ParseTree }
    | { kind: "declaration", name: string, value: ParseTree }
    | { kind: "statement", value: ParseTree }
    | { kind: "statement-list", values: ParseTree[] }
    | { kind: "block", values: ParseTree[] }


type OperatorPrecedences = {
    "*":   { "1": true },
    "/":   { "1": true },
    "+":   { "1": true; "2": true },
    "-":   { "1": true; "2": true },
    "==":  { "1": true; "2": true; "3": true },
    "===": { "1": true; "2": true; "3": true },
}

type ShouldShiftNewOp<Existing extends keyof BinOps, New extends keyof BinOps> =
    OperatorPrecedences[Existing] extends OperatorPrecedences[New] ?
        OperatorPrecedences[New] extends OperatorPrecedences[Existing] ? false : true :
        false;

type Parse<Tokens extends Tok[], SR extends ParseTree[] = []> =
    // Start by doing fairly innocuous reductions
    SR extends [
            { kind: "semicolon" },
            { kind: "expression" },
            { kind: "assignment-word" },
            { kind: "token" },
            { kind: "declaration-word" },
            ...any[]
        ] ?
        SR extends [
            { kind: "semicolon" },
            { kind: "expression", value: infer Exp extends ParseTree },
            { kind: "assignment-word" },
            { kind: "token", value: infer Name extends string },
            { kind: "declaration-word" },
            ...infer Rest extends ParseTree[]
        ] ? Parse<
            Tokens,
            [{ kind: "statement", value: { kind: "declaration", name: Name, value: Exp } }, ...Rest]
        > :
        never :
    // // Then, with fairly high priority manage the binop shift/reduce (so we can handle priority)
    [Tokens, SR] extends [
            [
                [string, "binop"],
                ...any[]
            ],
            [
                { kind: "expression" },
                { kind: "binop-word" },
                { kind: "expression" },
                ...any[]
            ]
        ] ?
        [Tokens, SR] extends [
            [
                [infer New extends keyof BinOps, "binop"],
                ...infer RestTok extends Tok[],
            ], [
                { kind: "expression", value: infer Right extends ParseTree },
                { kind: "binop-word", value: infer Existing extends keyof BinOps },
                { kind: "expression", value: infer Left extends ParseTree },
                ...infer RestSR extends ParseTree[]
            ]
        ] ?
        ShouldShiftNewOp<Existing, New> extends true ?
            Parse<RestTok, [{ kind: "binop-word", value: New }, ...SR]> :
            Parse<Tokens, [{ kind: "expression", value: { kind: "binop", op: Existing, left: Left, right: Right } }, ...RestSR]> :
        never :
    SR extends [
            { kind: "expression" },
            { kind: "binop-word" },
            { kind: "expression" },
            ...any[]
        ] ?
        SR extends [
            { kind: "expression", value: infer Right extends ParseTree },
            { kind: "binop-word", value: infer Existing extends keyof BinOps },
            { kind: "expression", value: infer Left extends ParseTree },
            ...infer RestSR extends ParseTree[]
        ] ?
        Parse<
            Tokens,
            [{ kind: "expression", value: { kind: "binop", op: Existing, left: Left, right: Right } }, ...RestSR]
        > :
        never :
    // Afterward, start reducing into statements
    SR extends [
            { kind: "expression" },
            { kind: "comma" },
            { kind: "expression" },
            ...any[],
        ] ?
        SR extends [
            { kind: "expression", value: infer Exp extends ParseTree },
            { kind: "comma" },
            { kind: "expression", value: { kind: "comma-series", values: infer Exps extends ParseTree[] } },
            ...infer RestSR extends ParseTree[]
        ] ? Parse<
            Tokens,
            [{ kind: "expression", value: { kind: "comma-series", values: [...Exps, Exp] } }, ...RestSR]
        > :
        SR extends [
            { kind: "expression", value: infer Exp2 extends ParseTree },
            { kind: "comma" },
            { kind: "expression", value: infer Exp1 extends ParseTree },
            ...infer RestSR extends ParseTree[]
        ] ? Parse<
            Tokens,
            [{ kind: "expression", value: { kind: "comma-series", values: [Exp1, Exp2] } }, ...RestSR]
        > :
        never :
    SR extends [
            { kind: "semicolon" },
            { kind: "expression" },
            { kind: "return-word" },
            ...any[],
        ] ?
        SR extends [
            { kind: "semicolon" },
            { kind: "expression", value: infer Exp extends ParseTree },
            { kind: "return-word" },
            ...infer RestSR extends ParseTree[],
        ] ?
        Parse<
            Tokens,
            [{ kind: "statement", value: { kind: "return", value: Exp } }, ...RestSR]
        > :
        never :
    SR extends [
            { kind: "statement" },
            { kind: "statement-list" },
            ...any[]
        ] ?
        SR extends [
            { kind: "statement", value: infer Exp extends ParseTree },
            { kind: "statement-list", values: infer Exps extends ParseTree[] },
            ...infer RestSR extends ParseTree[]
        ] ? Parse<
            Tokens,
            [{ kind: "statement-list", values: [...Exps, Exp]}, ...RestSR]
        > :
        never :
    SR extends [
            { kind: "close-brace" },
            { kind: "statement-list" },
            { kind: "open-brace" },
            ...any[]
        ] ?
        SR extends [
            { kind: "close-brace" },
            { kind: "statement-list", values: infer Exps extends ParseTree[] },
            { kind: "open-brace" },
            ...infer RestSR extends ParseTree[]
        ] ? Parse<
            Tokens,
            [{ kind: "statement", value: { kind: "block", values: Exps } }, ...RestSR]
        > :
        never :
    SR extends [
            { kind: "close-brace" },
            { kind: "open-brace" },
            ...any[],
        ] ?
        SR extends [
            { kind: "close-brace" },
            { kind: "open-brace" },
            ...infer RestSR extends ParseTree[]
        ] ? Parse<
            Tokens,
            [{ kind: "statement", value: { kind: "block", values: [] } }, ...RestSR]
        > :
        never :
    SR extends [
            { kind: "semicolon" },
            { kind: "expression" },
            ...any[],
        ] ?
        SR extends [
            { kind: "semicolon" },
            { kind: "expression", value: infer Exp extends ParseTree },
            ...infer RestSR extends ParseTree[],
        ] ?
        Parse<
            Tokens,
            [{ kind: "statement", value: Exp }, ...RestSR]
        > :
        never :
    SR extends [
            { kind: "arrow" },
            { kind: "close-paren" },
            { kind: "expression" },
            { kind: "open-paren" },
            ...any[]
        ] ?
        SR extends [
            { kind: "arrow" },
            { kind: "close-paren" },
            { kind: "expression", value: { kind: "comma-series", values: infer Args extends { kind: "token", value: string }[] } },
            { kind: "open-paren" },
            ...infer RestSR extends ParseTree[],
        ] ?
        Parse<
            Tokens,
            [{ kind: "fn-header", args: Args }, ...RestSR]
        > :
        SR extends [
            { kind: "arrow" },
            { kind: "close-paren" },
            { kind: "expression", value: infer Arg extends { kind: "token", value: string } },
            { kind: "open-paren" },
            ...infer RestSR extends ParseTree[],
        ] ?
        Parse<
            Tokens,
            [{ kind: "fn-header", args: [Arg] }, ...RestSR]
        > :
        never :
    SR extends [
            { kind: "close-paren" },
            { kind: "expression" },
            { kind: "open-paren" },
            { kind: "conditional-word" },
            ...any[]
        ] ?
        SR extends [
            { kind: "close-paren" },
            { kind: "expression", value: infer Arg extends ParseTree },
            { kind: "open-paren" },
            { kind: "conditional-word" },
            ...infer RestSR extends ParseTree[],
        ] ?
        Parse<
            Tokens,
            [{ kind: "conditional-header", condition: Arg}, ...RestSR]
        > :
        never :
    SR extends [
            { kind: "statement-list" },
            { kind: "fn-header" },
            ...any[]
        ] ?
        SR extends [
            { kind: "statement-list", values: [infer Body extends ParseTree] },
            { kind: "fn-header", args: infer Args extends ParseTree[] },
            ...infer RestSR extends ParseTree[],
        ] ? Parse<
            Tokens,
            [{ kind: "expression", value: { kind: "arrow-fn", args: Args, body: Body } }, ...RestSR]
        > :
        never :
    SR extends [
            { kind: "close-paren" },
            { kind: "expression" },
            { kind: "open-paren" },
            { kind: "expression" },
            ...any[]
        ] ?
        SR extends [
            { kind: "close-paren" },
            { kind: "expression", value: { kind: "comma-series", values: infer Args extends ParseTree[] } },
            { kind: "open-paren" },
            { kind: "expression", value: infer Fn extends ParseTree },
            ...infer RestSR extends ParseTree[],
        ] ? Parse<
            Tokens,
            [{ kind: "expression", value: { kind: "call", fn: Fn, args: Args }}, ...RestSR]
        > :
        SR extends [
            { kind: "close-paren" },
            { kind: "expression", value: infer Arg extends ParseTree },
            { kind: "open-paren" },
            { kind: "expression", value: infer Fn extends ParseTree },
            ...infer RestSR extends ParseTree[],
        ] ? Parse<
            Tokens,
            [{ kind: "expression", value: { kind: "call", fn: Fn, args: [Arg] }}, ...RestSR]
        > :
        never :
    [Tokens, SR] extends [
            [
                // Negative lookahead against `=`
                // We're trying to avoid over-optimizing if ... else ... chains
                [string, Exclude<LexTokenValues, "antecedent">],
                ...any[]
            ] | [],
            [
                { kind: "statement-list"},
                { kind: "conditional-header" },
                ...any[]
            ]
        ] ?
        SR extends[
            { kind: "statement-list", values: [infer Body extends ParseTree] },
            { kind: "conditional-header", condition: infer Condition extends ParseTree },
            ...infer RestSR extends ParseTree[],
        ] ? Parse<
            Tokens,
            [{ kind: "statement", value: { kind: "conditional", condition: Condition, body: Body } }, ...RestSR]
        > :
        never :
    SR extends [
            { kind: "statement-list" },
            { kind: "antecedent-word" },
            { kind: "statement-list" },
            { kind: "conditional-header" },
            ...any[]
        ] ?
        SR extends [
            { kind: "statement-list", values: [infer FalseCase extends ParseTree] },
            { kind: "antecedent-word" },
            { kind: "statement-list", values: [infer TrueCase extends ParseTree] },
            { kind: "conditional-header", condition: infer Condition extends ParseTree },
            ...infer RestSR extends ParseTree[],
        ] ? Parse<
            Tokens,
            [{ kind: "statement", value: { kind: "antecedent", condition: Condition, trueCase: TrueCase, falseCase: FalseCase }}, ...RestSR]
        > :
        never :
    SR extends [
            { kind: "statement" },
            ...any[]
        ] ?
        SR extends [
            { kind: "statement", value: infer Exp extends ParseTree },
            ...infer RestSR extends ParseTree[]
        ] ? Parse<
            Tokens,
            [{ kind: "statement-list", values: [Exp] }, ...RestSR]
        > :
        never :
    [Tokens, SR] extends [
            [
                // Negative lookahead against `=`
                [string, Exclude<LexTokenValues, "assignment">],
                ...any[]
            ],
            [
                { kind: "token" },
                ...any[]
            ]
        ] ?
        SR extends [
            infer Tok extends { kind: "token", value: string },
            ...infer RestSR extends ParseTree[]
        ] ? Parse<
            Tokens,
            [{ kind: "expression", value: Tok }, ...RestSR]
        > :
        never :
    // Then, shift in any new tokens
    Tokens extends [
            [infer Op extends keyof BinOps, "binop"],
            ...infer RestTok extends Tok[],
        ] ? Parse<
            RestTok,
            [{ kind: "binop-word", value: Op }, ...SR]
        > :
    Tokens extends [
            [`${infer Num extends number}`, "digit"],
            ...infer RestTok extends Tok[],
        ] ? Parse<
            RestTok,
            [{ kind: "expression", value: { kind: "number-literal", value: Num } }, ...SR]
        > :
    Tokens extends [
            [`${infer Bool extends boolean}`, "bool"],
            ...infer RestTok extends Tok[],
        ] ? Parse<
            RestTok,
            [{ kind: "expression", value: { kind: "bool-literal", value: Bool } }, ...SR]
        > :
    Tokens extends [
            [string, "semicolon"],
            ...infer RestTok extends Tok[],
        ] ? Parse<
            RestTok,
            [{ kind: "semicolon"}, ...SR]
        > :
    Tokens extends [
            [infer Name extends string, "token"],
            ...infer RestTok extends Tok[],
        ] ? Parse<
            RestTok,
            [{ kind: "token", value: Name }, ...SR]
        > :
    Tokens extends [
            [`"${infer Str extends string}"` | `'${infer Str extends string}'`, "string"],
            ...infer RestTok extends Tok[],
        ] ? Parse<
            RestTok,
            [{ kind: "expression", value: { kind: "string-literal", value: Str } }, ...SR]
        > :
    Tokens extends [
            [string, "assignment"],
            ...infer RestTok extends Tok[],
        ] ? Parse<
            RestTok,
            [{ kind: "assignment-word"}, ...SR]
        > :
    Tokens extends [
            [string, "declare"],
            ...infer RestTok extends Tok[],
        ] ? Parse<
            RestTok,
            [{ kind: "declaration-word"}, ...SR]
        > :
    Tokens extends [
            [string, "open-brace"],
            ...infer RestTok extends Tok[],
        ] ? Parse<
            RestTok,
            [{ kind: "open-brace" }, ...SR]
        > :
    Tokens extends [
            [string, "close-brace"],
            ...infer RestTok extends Tok[],
        ] ? Parse<
            RestTok,
            [{ kind: "close-brace" }, ...SR]
        > :
    Tokens extends [
            [string, "open-paren"],
            ...infer RestTok extends Tok[],
        ] ? Parse<
            RestTok,
            [{ kind: "open-paren" }, ...SR]
        > :
    Tokens extends [
            [string, "close-paren"],
            ...infer RestTok extends Tok[],
        ] ? Parse<
            RestTok,
            [{ kind: "close-paren" }, ...SR]
        > :
    Tokens extends [
            [string, "ret"],
            ...infer RestTok extends Tok[],
        ] ? Parse<
            RestTok,
            [{ kind: "return-word" }, ...SR]
        > :
    Tokens extends [
            [string, "comma"],
            ...infer RestTok extends Tok[],
        ] ? Parse<
            RestTok,
            [{ kind: "comma" }, ...SR]
        > :
    Tokens extends [
            [string, "arrow"],
            ...infer RestTok extends Tok[],
        ] ? Parse<
            RestTok,
            [{ kind: "arrow" }, ...SR]
        > :
    Tokens extends [
            [string, "conditional"],
            ...infer RestTok extends Tok[]
        ] ? Parse<
            RestTok,
            [{ kind: "conditional-word" }, ...SR]
        > :
    Tokens extends [
            [string, "antecedent"],
            ...infer RestTok extends Tok[]
        ] ? Parse<
            RestTok,
            [{ kind: "antecedent-word" }, ...SR]
        > :
    [Tokens, SR] extends [[], [infer Res]] ? { kind: "success", program: Res } :
    { kind: "parse-error", tokens: Tokens, stack: SR }



type Value =
    | { kind: "number", value: number }
    | { kind: "string", value: string }
    | { kind: "bool", value: boolean }
    | { kind: "undefined", value: undefined }
    | { kind: "fn", args: string[], body: ParseTree }

type Context = {
    variables: { [key: string]: Value },
    retVal: Value
    parent?: Context
    shortCircuited: boolean,
}

type FindInContext<Tok extends string, C extends Context> =
    C["variables"][Tok] extends infer V extends Value ? V :
    C["parent"] extends infer CP extends Context ?
    FindInContext<Tok, CP> :
    { kind: "undefined", value: undefined }

type TryAdd<Left extends Value, Right extends Value> =
    [Left, Right] extends [
        { kind: "number", value: infer LeftNum extends number },
        { kind: "number", value: infer RightNum extends number },
    ] ? { kind: "number", value: BigAdd<LeftNum, RightNum> } :
    [Left, Right] extends [
        { value: infer Left extends number | string | undefined | boolean },
        { value: infer Right extends number | string | undefined | boolean },
    ] ? { kind: "string", value: `${Left}${Right}` } :
    { kind: "undefined", value: undefined };

type TryMult<Left extends Value, Right extends Value> =
    [Left, Right] extends [
        { kind: "number", value: infer LeftNum extends number },
        { kind: "number", value: infer RightNum extends number },
    ] ? { kind: "number", value: BigMult<LeftNum, RightNum> } :
    { kind: "undefined", value: undefined }

type TryEq<Left extends Value, Right extends Value> =
    [Left, Right] extends [Right, Left] ? { kind: "bool", value: true } :
    { kind: "bool", value: false };

type GetArgs<Args extends { kind: "token", value: string }[], Acc extends string[] = []> =
    Args extends [
        { kind: "token", value: infer Arg extends string },
        ...infer Rest extends { kind: "token", value: string }[]
    ] ? GetArgs<Rest, [...Acc, Arg]> :
    Acc

type BuildContext<Args extends string[], Values extends Value[], Acc extends { [K: string]: Value } = {}> =
    [Args, Values] extends [
        [
            infer Arg extends string,
            ...infer RestArgs extends string[],
        ],
        [
            infer Val extends Value,
            ...infer RestVals extends Value[],
        ]
    ] ? BuildContext<RestArgs, RestVals, Acc & { [K in Arg]: Val }> :
    Acc

type TryCall<Val extends Value, CallArgs extends Value[], C extends Context> =
    Val extends { kind: "fn", args: infer Args extends string[], body: { kind: "block", values: infer Body extends ParseTree[] } } ?
    ExecuteStatementsMasked<Body, { variables: BuildContext<Args, CallArgs>, parent: C, retVal: { kind: "undefined", value: undefined }, shortCircuited: false }>["retVal"] :
    { kind: "undefined", value: undefined }

type ExecuteAll<Exps extends ParseTree[], C extends Context, Acc extends Value[] = []> =
    Exps extends [
        infer Exp extends ParseTree,
        ...infer Rest extends ParseTree[],
    ] ? ExecuteAll<Rest, C, [...Acc, ExecuteMasked<Exp, C>]> :
    Acc

type ExecuteMasked<Exp extends ParseTree, C extends Context> =
    ExecuteExpression<Exp, C> extends infer V extends Value ? V : never;

type IsTruthy<Val extends Value> =
    Val extends (
        | { kind: "undefined" }
        | { kind: "string", value: "" }
        | { kind: "bool", value: false }
        | { kind: "number", value: 0 }
    ) ? false :
    true;

type PopBlock<C extends Context> =
    {
        variables: NonNullable<C["parent"]>["variables"],
        parent: NonNullable<C["parent"]>["parent"],
        retVal: C["retVal"],
        shortCircuited: C["shortCircuited"],
    }

type PostBlockExecution<C extends Context, Stmt extends ParseTree[], NewContext extends Context = PopBlock<C>> =
    NewContext extends { shortCircuited: true } ? NewContext :
    ExecuteStatementsMasked<Stmt, C>

type ExecuteExpression<Exp extends ParseTree, C extends Context = { variables: {}, parent: undefined, retVal: { kind: "undefined", value: undefined }, shortCircuited: false }> =
    Exp extends { kind: "number-literal", value: infer Val extends number } ?
        { kind: "number", value: Val } :
    Exp extends { kind: "string-literal", value: infer Val extends string } ?
        { kind: "string", value: Val } :
    Exp extends { kind: "bool-literal", value: infer Val extends boolean } ?
        { kind: "bool", value: Val } :
    Exp extends { kind: "binop", op: "+", left: infer Left extends ParseTree, right: infer Right extends ParseTree } ?
        TryAdd<ExecuteMasked<Left, C>, ExecuteMasked<Right, C>> :
    Exp extends { kind: "binop", op: "*", left: infer Left extends ParseTree, right: infer Right extends ParseTree } ?
        TryMult<ExecuteMasked<Left, C>, ExecuteMasked<Right, C>> :
    Exp extends { kind: "binop", op: "===", left: infer Left extends ParseTree, right: infer Right extends ParseTree } ?
        TryEq<ExecuteMasked<Left, C>, ExecuteMasked<Right, C>> :
    Exp extends { kind: "arrow-fn", args: infer Args extends { kind: "token", value: string }[], body: infer Body extends ParseTree } ?
        { kind: "fn", args: GetArgs<Args>, body: Body } :
    Exp extends { kind: "call", fn: infer Fn extends ParseTree, args: infer Args extends ParseTree[] } ?
        TryCall<ExecuteMasked<Fn, C>, ExecuteAll<Args, C>, C> :
    Exp extends { kind: "token", value: infer Tok extends string } ?
        FindInContext<Tok, C> :
    { kind: "undefined", value: undefined };

type ExecuteStatementsMasked<Stmt extends ParseTree[], C extends Context> =
    ExecuteStatements<Stmt, C> extends infer NewCtx extends Context ? NewCtx :
    never;

type ExecuteStatements<
    Stmt extends ParseTree[],
    C extends Context = {
        variables: {},
        parent: undefined,
        retVal: { kind: "undefined", value: undefined },
        shortCircuited: false,
    }
> =
    Stmt extends [
        { kind: "declaration", name: infer Name extends string, value: infer Value extends ParseTree },
        ...infer Rest extends ParseTree[]
    ] ? ExecuteStatementsMasked<
        Rest,
        {
            variables: C["variables"] & { [K in Name]: ExecuteMasked<Value, C> },
            parent: C["parent"],
            retVal: C["retVal"],
            shortCircuited: C["shortCircuited"],
        }
    > :
    Stmt extends [
        {
            kind: "conditional",
            condition: infer Condition extends ParseTree,
            body: infer Body extends ParseTree
        },
        ...infer Rest extends ParseTree[]
    ] ?
        IsTruthy<ExecuteMasked<Condition, C>> extends true ?
            ExecuteStatementsMasked<[Body, ...Rest], C> :
            ExecuteStatementsMasked<Rest, C> :
    Stmt extends [
        {
            kind: "antecedent",
            condition: infer Condition extends ParseTree,
            trueCase: infer TrueCase extends ParseTree,
            falseCase: infer FalseCase extends ParseTree,
        },
        ...infer Rest extends ParseTree[]
    ] ?
        IsTruthy<ExecuteMasked<Condition, C>> extends true ?
            ExecuteStatementsMasked<[TrueCase, ...Rest], C> :
            ExecuteStatementsMasked<[FalseCase, ...Rest], C> :
    Stmt extends [
        {
            kind: "block",
            values: infer Values extends ParseTree[],
        },
        ...infer Rest extends ParseTree[]
    ] ?
        PostBlockExecution<
            ExecuteStatementsMasked<
                Values,
                {
                    variables: {},
                    parent: C,
                    retVal: { kind: "undefined", value: undefined },
                    shortCircuited: false,
                }
            >,
            Rest
        > :
    Stmt extends [
        { kind: "return", value: infer Val extends ParseTree },
        ...infer _Rest extends ParseTree[]
    ] ? {
        variables: C["variables"],
        parent: C["parent"],
        retVal: ExecuteMasked<Val, C>
        shortCircuited: true,
    } :
    Stmt extends [any, ...infer Rest extends ParseTree[]] ? ExecuteStatementsMasked<Rest, C> :
    C;

type CallForResult<S extends string> =
    Parse<Lex<Tokenize<S>>> extends { program: { values: infer Values extends ParseTree[] } } ?
    ExecuteStatements<Values>["retVal"] :
    "Parse Error!";

type Execute<S> =
    S extends { program: { values: infer Values extends ParseTree[] } } ?
        ExecuteStatements<Values> :
        "Parse Error!";


type TsToValue<Args extends any[], Acc extends Value[] = []> =
    Args extends [
        infer Head,
        ...infer Rest
    ] ?
        Head extends number ? TsToValue<Rest, [...Acc, { kind: "number", value: Head }]> :
        Head extends string ? TsToValue<Rest, [...Acc, { kind: "string", value: Head }]> :
        Head extends boolean ? TsToValue<Rest, [...Acc, { kind: "bool", value: Head }]> :
        TsToValue<Rest, [...Acc, { kind: "undefined", value: undefined}]> :
    Acc

type ValueToTs<Val extends Value> =
    Val extends { kind: "number", value: infer TsVal } ? TsVal :
    Val extends { kind: "string", value: infer TsVal } ? TsVal :
    Val extends { kind: "bool", value: infer TsVal } ? TsVal :
    Val extends { kind: "undefined", value: infer TsVal } ? TsVal :
    undefined;

type Eval<S extends string, Args extends any[], C extends Context = { variables: {}, parent: undefined, retVal: { kind: "undefined", value: undefined }, shortCircuited: false } > =
    Parse<Lex<Tokenize<S>>> extends {
        program: {
            kind: "expression",
            value: infer Fn extends {
                kind: "arrow-fn",
                args: ParseTree[],
                body: ParseTree,
            }
        }
    } ? ValueToTs<TryCall<ExecuteMasked<Fn, C>, TsToValue<Args>, C>> :
    false

const polynomial = <X extends number, Y extends number>(x: X, y: Y): Eval<`
    (x, y) => {
        if (y === 0) {
            return 0;
        }

        return 4*x*x + 2*x*y + 4*y;

    }
`, [X, Y]> => {
    if (y === 0) {
        return 0 as any;
    }

    return (3*x*x + 2*x*y + 4*y) as any;
}

const firstResult = polynomial(5, 10);
const secondResult  = polynomial(10, 0);
