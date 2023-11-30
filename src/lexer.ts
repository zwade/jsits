import { LexTokenKeys, LexTokenMap, Tok } from "./tokens";

export type Lex<Tokens extends string[], Acc extends Tok[] = []> =
    Tokens extends [] ? Acc :
    Tokens extends [infer Head, ...infer Tail extends string[]] ?
        Head extends (infer Key extends LexTokenKeys) ? Lex<Tail, [...Acc, [Head, LexTokenMap[Key]]]> :
        Head extends string ? Lex<Tail, [...Acc, [Head, "token"]]> :
        never :
    never;
