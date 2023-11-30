import type { BigAdd, BigMult, NumIsGreater, NumIsGreaterEq, NumIsLess, NumIsLessEq } from "./math";
import { ParseTree } from "./parser";

export type Value =
    | { kind: "number", value: number }
    | { kind: "string", value: string }
    | { kind: "bool", value: boolean }
    | { kind: "undefined", value: undefined }
    | { kind: "fn", args: string[], body: ParseTree }

export type Context = {
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

type UpdateContext<Tok extends string, C extends Context, Val extends Value> =
    C["variables"] extends { [K in Tok]: any } ?
        Omit<C, "variables"> & {
            variables: Omit<C["variables"], Tok> & {
                [K in Tok]: Val
            }
        } :
    C["parent"] extends Context ? C & { parent: UpdateContext<Tok, C["parent"], Val> } :
    C;

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

type TryOr<Left extends ParseTree, Right extends ParseTree, C extends Context, _Capture extends Value = ExecuteExpressionMasked<Left, C>> =
    IsTruthy<_Capture> extends true ? _Capture : ExecuteExpressionMasked<Right, C>;

type TryAnd<Left extends ParseTree, Right extends ParseTree, C extends Context, _Capture extends Value = ExecuteExpressionMasked<Left, C>> =
    IsTruthy<_Capture> extends true ? ExecuteExpressionMasked<Right, C> : _Capture;

type TryComparison<Left extends Value, Right extends Value, Op extends string> =
    [Left, Right] extends [
        { kind: "number", value: infer LeftNum extends number },
        { kind: "number", value: infer RightNum extends number },
    ] ?
        Op extends ">"  ? { kind: "bool", value: NumIsGreater<LeftNum, RightNum> } :
        Op extends ">=" ? { kind: "bool", value: NumIsGreaterEq<LeftNum, RightNum> } :
        Op extends "<"  ? { kind: "bool", value: NumIsLess<LeftNum, RightNum> } :
        Op extends "<=" ? { kind: "bool", value: NumIsLessEq<LeftNum, RightNum> } :
        { kind: "undefined", value: undefined } :
    { kind: "undefined", value: undefined };

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

export type TryCall<Val extends Value, CallArgs extends Value[], C extends Context> =
    Val extends { kind: "fn", args: infer Args extends string[], body: { kind: "block", values: infer Body extends ParseTree[] } } ?
    ExecuteStatementsMasked<
        Body,
        {
            variables: BuildContext<Args, CallArgs>,
            parent: C,
            retVal: { kind: "undefined", value: undefined },
            shortCircuited: false
        }
    >["retVal"] :
    { kind: "undefined", value: undefined }

type ExecuteAll<Exps extends ParseTree[], C extends Context, Acc extends Value[] = []> =
    Exps extends [
        infer Exp extends ParseTree,
        ...infer Rest extends ParseTree[],
    ] ? ExecuteAll<Rest, C, [...Acc, ExecuteExpressionMasked<Exp, C>]> :
    Acc

export type ExecuteExpressionMasked<Exp extends ParseTree, C extends Context> =
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
    Exp extends { kind: "binop", op: "+" } ?
        Exp extends { kind: "binop", op: "+", left: infer Left extends ParseTree, right: infer Right extends ParseTree } ?
            TryAdd<ExecuteExpressionMasked<Left, C>, ExecuteExpressionMasked<Right, C>> :
        never :
    Exp extends { kind: "binop", op: "*" } ?
        Exp extends { kind: "binop", op: "*", left: infer Left extends ParseTree, right: infer Right extends ParseTree } ?
            TryMult<ExecuteExpressionMasked<Left, C>, ExecuteExpressionMasked<Right, C>> :
        never :
    Exp extends { kind: "binop", op: "===" } ?
        Exp extends { kind: "binop", op: "===", left: infer Left extends ParseTree, right: infer Right extends ParseTree } ?
            TryEq<ExecuteExpressionMasked<Left, C>, ExecuteExpressionMasked<Right, C>> :
        never :
    Exp extends { kind: "binop", op: "<" | "<=" | ">" | ">=" } ?
        Exp extends { kind: "binop", op: infer Op extends "<" | "<=" | ">" | ">=", left: infer Left extends ParseTree, right: infer Right extends ParseTree } ?
            TryComparison<ExecuteExpressionMasked<Left, C>, ExecuteExpressionMasked<Right, C>, Op> :
        never :
    Exp extends { kind: "binop", op: "||" } ?
        Exp extends { kind: "binop", op: "||", left: infer Left extends ParseTree, right: infer Right extends ParseTree } ?
            TryOr<Left, Right, C> :
        never :
    Exp extends { kind: "binop", op: "&&" } ?
        Exp extends { kind: "binop", op: "&&", left: infer Left extends ParseTree, right: infer Right extends ParseTree } ?
            TryAnd<Left, Right, C> :
        never :
    Exp extends { kind: "arrow-fn" } ?
        Exp extends { kind: "arrow-fn", args: infer Args extends { kind: "token", value: string }[], body: infer Body extends ParseTree } ?
            { kind: "fn", args: GetArgs<Args>, body: Body } :
        never :
    Exp extends { kind: "call" } ?
        Exp extends { kind: "call", fn: infer Fn extends ParseTree, args: infer Args extends ParseTree[] } ?
            TryCall<ExecuteExpressionMasked<Fn, C>, ExecuteAll<Args, C>, C> :
        never :
    Exp extends { kind: "token" } ?
        Exp extends { kind: "token", value: infer Tok extends string } ?
            FindInContext<Tok, C> :
        never :
    { kind: "undefined", value: undefined };

type ExecuteStatementsMasked<Stmt extends ParseTree[], C extends Context> =
    ExecuteStatements<Stmt, C> extends infer NewCtx extends Context ? NewCtx :
    never;

export type ExecuteStatements<
    Stmt extends ParseTree[],
    C extends Context = {
        variables: {},
        parent: undefined,
        retVal: { kind: "undefined", value: undefined },
        shortCircuited: false,
    }
> =
    Stmt extends [
            { kind: "declaration" },
            ...any[],
        ] ?
        Stmt extends [
            { kind: "declaration", name: infer Name extends string, value: infer Value extends ParseTree },
            ...infer Rest extends ParseTree[]
        ] ? ExecuteStatementsMasked<
            Rest,
            {
                variables: C["variables"] & { [K in Name]: ExecuteExpressionMasked<Value, C> },
                parent: C["parent"],
                retVal: C["retVal"],
                shortCircuited: C["shortCircuited"],
            }
        > :
        never :
    Stmt extends [
            { kind: "redeclaration" },
            ...any[],
        ] ?
        Stmt extends [
            { kind: "redeclaration", name: infer Name extends string, value: infer Value extends ParseTree },
            ...infer Rest extends ParseTree[]
        ] ? ExecuteStatementsMasked<
            Rest,
            UpdateContext<Name, C, ExecuteExpressionMasked<Value, C>>
        > :
        never :
    Stmt extends [
            { kind: "conditional" },
            ...any[]
        ] ?
        Stmt extends [
            {
                kind: "conditional",
                condition: infer Condition extends ParseTree,
                body: infer Body extends ParseTree
            },
            ...infer Rest extends ParseTree[]
        ] ?
            IsTruthy<ExecuteExpressionMasked<Condition, C>> extends true ?
                ExecuteStatementsMasked<[Body, ...Rest], C> :
                ExecuteStatementsMasked<Rest, C> :
        never :
    Stmt extends [
            { kind: "antecedent" },
            ...any[]
        ] ?
        Stmt extends [
            {
                kind: "antecedent",
                condition: infer Condition extends ParseTree,
                trueCase: infer TrueCase extends ParseTree,
                falseCase: infer FalseCase extends ParseTree,
            },
            ...infer Rest extends ParseTree[]
        ] ?
            IsTruthy<ExecuteExpressionMasked<Condition, C>> extends true ?
                ExecuteStatementsMasked<[TrueCase, ...Rest], C> :
                ExecuteStatementsMasked<[FalseCase, ...Rest], C> :
        never :
    Stmt extends [
            { kind: "block" },
            ...any[]
        ] ?
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
        never :
    Stmt extends [
            { kind: "return" },
            ...any[],
        ] ?
        Stmt extends [
            { kind: "return", value: infer Val extends ParseTree },
            ...infer _Rest extends ParseTree[]
        ] ? {
            variables: C["variables"],
            parent: C["parent"],
            retVal: ExecuteExpressionMasked<Val, C>
            shortCircuited: true,
        } :
        Stmt extends [any, ...infer Rest extends ParseTree[]] ? ExecuteStatementsMasked<Rest, C> :
        never :
    Stmt extends [
            any,
            ...any[],
        ] ?
        Stmt extends [
            any,
            ...infer Rest extends ParseTree[],
        ] ?
            ExecuteStatementsMasked<Rest, C> :
        never :
    C
