import { Context, ExecuteExpressionMasked, ExecuteStatements, TryCall, Value } from "./interpreter";
import { Lex } from "./lexer";
import { Parse, ParseTree } from "./parser";
import { Tokenize } from "./tokenizer";

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

export type CallForResult<S extends string> =
    Parse<Lex<Tokenize<S>>> extends { program: { values: infer Values extends ParseTree[] } } ?
    ExecuteStatements<Values>["retVal"] :
    "Parse Error!";

export type Execute<S> =
    S extends { program: { values: infer Values extends ParseTree[] } } ?
        ExecuteStatements<Values> :
        "Parse Error!";



export type Eval<S extends string, Args extends any[], C extends Context = { variables: {}, parent: undefined, retVal: { kind: "undefined", value: undefined }, shortCircuited: false } > =
    Parse<Lex<Tokenize<S>>> extends {
        program: {
            kind: "expression",
            value: infer Fn extends {
                kind: "arrow-fn",
                args: ParseTree[],
                body: ParseTree,
            }
        }
    } ? ValueToTs<TryCall<ExecuteExpressionMasked<Fn, C>, TsToValue<Args>, C>> :
    "Parse Error!"
