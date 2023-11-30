import { BinOps, Symbols, Whitespace } from "./tokens";

type AddIfNotEmpty<Tokens extends string[], Tok extends string> = Tok extends "" ? Tokens : [...Tokens, Tok]

type MaximallyTokenizeOperator<C extends string, Rest extends string> =
    Rest extends `${infer C2 extends string}${infer NewRest}` ?
        `${C}${C2}` extends `${keyof BinOps | keyof Symbols}` ? MaximallyTokenizeOperator<`${C}${C2}`, NewRest> :
        [C, Rest] :
    [C, Rest];

export type Tokenize<Text, CurrentToken extends string = "", Tokens extends string[] = []> =
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
