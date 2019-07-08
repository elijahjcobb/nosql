/**
 *
 * Elijah Cobb
 * elijah@elijahcobb.com
 * https://elijahcobb.com
 *
 *
 * Copyright 2019 Elijah Cobb
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the "Software"), to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
 * to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial
 * portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
 * WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 * OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */

import { ECSQLCommandable } from "./ECSQLCommandable";
import { ECErrorStack, ECErrorOriginType, ECErrorType } from "@elijahjcobb/error";

/*

 SELECT *
FROM terms
WHERE id IN (SELECT term_id FROM terms_relation WHERE taxonomy='categ');

 */

/**
 * Different operators that can be used in a ECSQLFilter instance.
 */
export enum ECSQLOperator {
	Equal = "=",
	NotEqual = "!=",
	GreaterThan = ">",
	LessThan = "<",
	GreaterThanOrEqual = ">=",
	LessThanOrEqual = "<=",
	ContainedIn = "IN",
	Like = "LIKE"
}

/**
 * An enum for defining conditionals.
 */
export enum ECSQLCondition {
	And = "AND",
	Or = "OR"
}

/**
 * A type defining allowed values for a filter.
 */
export type ECSQLFilterValue = string | boolean | number | string[] | number[];

export type ECSQLFilterGroupItems<T> = ECSQLFilterGroup<T> | ECSQLFilter<T>;

export class ECSQLFilterGroup<T> implements ECSQLCommandable {

	public condition: ECSQLCondition;
	public filters: ECSQLFilterGroupItems<T>[];

	public constructor(condition: ECSQLCondition, ...filters: ECSQLFilterGroupItems<T>[]) {

		this.condition = condition;
		this.filters = filters;

	}

	public generateSQLCommand(): string {

		let commands: string[] = [];

		this.filters.forEach((filter: ECSQLFilterGroupItems<T>) => {

			commands.push(`(${filter.generateSQLCommand()})`);

		});

		return `(${commands.join(` ${this.condition} `)})`;

	}

}

/**
 * A class representing a filter to be used in ECSQLQuery instances to filter the query by a key and value using the provided operator.
 */
export class ECSQLFilter<T> implements ECSQLCommandable {

	private readonly key: keyof T;
	private readonly value: ECSQLFilterValue;
	private readonly operator: ECSQLOperator;

	/**
	 * Create an instance of ECSQLFilter.
	 * @param {string} key The key to filter.
	 * @param {ECSQLOperator} operator The operator to be used.
	 * @param {string | number | boolean | any[]} value The value to be operated against.
	 */
	public constructor(key: keyof T, operator: ECSQLOperator, value: ECSQLFilterValue) {

		this.key = key;
		this.operator = operator;

		if (typeof value === "boolean") {
			this.value = value ? 1 : 0;
		} else {
			this.value = value;
		}

	}

	/**
	 * Generate the SQL parameter that will be added to the main ECSQLQuery SQL command string.
	 * @return {string} A SQL parameter string.
	 */
	public generateSQLCommand(): string {


		let command: string = (this.key as string).replace(RegExp("'", "g"), "");

		if (this.operator === ECSQLOperator.ContainedIn) {

			if (!Array.isArray(this.value)) {

				let stack: ECErrorStack = ECErrorStack.newWithMessageAndType(ECErrorOriginType.BackEnd, ECErrorType.ParameterIncorrectFormat, new Error("If you use the in operator, you must supply an array as the value."));
				stack.add(ECErrorOriginType.BackEnd, ECErrorType.InternalSQLError, new Error("Internal server error."));

				throw stack;

			}

			let values: any[] = [];
			(this.value as any[]).forEach((value: any) => {

				let safeValue: any = value;
				if (typeof value === "string") safeValue = value.replace(RegExp("'", "g"), "\\'");
				values.push(safeValue);

			});

			command += " IN ('";
			command += values.join("','");
			command += "')";

		} else {

			command += this.operator;

			if (typeof this.value === "string") {
				command += "'";
				command += (this.value as string).replace(RegExp("'", "g"), "\\'") + "'";
			} else {
				command += this.value;
			}

		}

		return command;

	}

}