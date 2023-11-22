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
