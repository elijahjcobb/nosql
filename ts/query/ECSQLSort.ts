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

import { ECPrototype } from "@elijahjcobb/collections";
import { ECSQLCommandable } from "./ECSQLCommandable";

/**
 * An enum defining the direction a ECSQLSort can produce.
 */
export enum ECSQLSortDirection {
	LeastToGreatest = "ASC",
	GreatestToLeast = "DESC"
}

/**
 * A class representing a way of sorting the responses provided by a ECSQLQuery.
 */
export class ECSQLSort<T> extends ECPrototype implements ECSQLCommandable {

	private readonly key: keyof T;
	private readonly direction: ECSQLSortDirection;

	/**
	 * Create a new ECSQLSort instance.
	 * @param {string} key The key to sort by.
	 * @param {ECSQLSortDirection} direction The direction to sort. Defaults to LeastToGreatest.
	 */
	public constructor(key: keyof T, direction: ECSQLSortDirection = ECSQLSortDirection.LeastToGreatest) {

		super();

		this.key = key;
		this.direction = direction;

	}

	/**
	 * Generate the SQL parameter needed to implement the sorting functionality.
	 * @return {string}
	 */
	public generateSQLCommand(): string {

		return `ORDER BY ${this.key} ${this.direction}`;

	}

}