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

import { ECSQLFilter, ECSQLOperator, ECSQLFilterGroupItems } from "./ECSQLFilter";
import { ECSQLCommandable } from "./ECSQLCommandable";
import { ECSQLSort } from "./ECSQLSort";
import { ECSQLDatabase } from "../ECSQLDatabase";
import { ECSQLResponse } from "./ECSQLResponse";
import { ECSQLObject, ECSQLObjectPropType } from "..";
import { ECArray, ECArrayList } from "@elijahjcobb/collections";
import { ECErrorOriginType, ECErrorStack, ECErrorType } from "@elijahjcobb/error";


export type ECSQLQueryFactory<T, P> = { new<P>(): T };

/**
 * A class that queries the SQL database from filter, a sort, limit, and conditionals.
 */
export class ECSQLQuery<Type extends ECSQLObject<Props>, Props extends ECSQLObjectPropType> implements ECSQLCommandable {

	private readonly table: string;
	private readonly filter: ECSQLFilterGroupItems<Props>;
	private sort: ECSQLSort<Props>;
	private limit: number;
	private readonly factory: ECSQLQueryFactory<Type, Props>;

	/**
	 * Create a new query instance
	 * @param type A class that extends ECSQLObject
	 * @param filter A filter group item.
	 */
	public constructor(type: ECSQLQueryFactory<Type, Props>, filter?: ECSQLFilterGroupItems<Props>) {


		this.filter = filter;
		this.factory = type;
		this.table = (new this.factory()).table;

	}

	/**
	 * Set the limit of rows that will be returned.
	 * @param {number} limit The number of rows to be returned.
	 */
	public setLimit(limit: number): void {

		this.limit = limit;

	}

	/**
	 * Set the ECSQLSort instance to be used in the ECSQLQuery.
	 * @param {ECSQLSort} sort The sort method to be used.
	 */
	public setSort(sort: ECSQLSort<Props>): void {

		this.sort = sort;

	}

	/**
	 * Generate the entire SQL command from all filter, sort, and limit.
	 * @param {boolean} isCount Whether or not there is a count limit.
	 * @return {string} The SQL command.
	 */
	public generateSQLCommand(isCount?: boolean): string {

		let command: string = "";

		if (isCount) {
			command += "SELECT COUNT(*) FROM ";
		} else {
			command += "SELECT * FROM ";
		}

		command += this.table;

		if (this.filter) {

			command += " WHERE ";
			command += `(${this.filter.generateSQLCommand()})`;

		}

		if (this.sort) {

			command += " ";
			command += this.sort.generateSQLCommand();

		}

		if (this.limit !== undefined) {

			command += " LIMIT ";
			command += this.limit;

		}

		command += ";";

		return command;

	}

	/**
	 * Get the first object from the query instance.
	 * @param {boolean} allowUndefined Whether or not an error should be thrown if the object is undefined.
	 * @return {Promise<ECSQLResponse>} A promise containing a ECSQLResponse instance.
	 */
	public async getFirstObject(allowUndefined?: boolean): Promise<Type> {

		this.limit = 1;
		const items: ECArray<Type> = await this.getAllObjects();
		return items.get(0);

	}

	/**
	 * Get all objects that follow the specified query.
	 * @return {Promise<ECArray<ECSQLResponse>>} A promise returning an ECArray of ECSQLResponse instances.
	 */
	public async getAllObjects(): Promise<ECArray<Type>> {

		let objects: object[] = await ECSQLDatabase.query(this.generateSQLCommand());
		let responsesUnformed: ECArrayList<ECSQLResponse> = new ECArrayList<ECSQLResponse>();
		objects.forEach((object: object) => responsesUnformed.add(new ECSQLResponse(this.table, object)));

		let responses: ECArrayList<Type> = new ECArrayList<Type>();

		await responsesUnformed.forEachSync(async (response: ECSQLResponse) => {

			let object: Type = new this.factory();
			await object.decode(response.getContent());
			responses.add(object);

		});

		return responses.toArray();

	}

	/**
	 * Count how many objects follow the specified query.
	 * @return {Promise<number>} A promise containing a number.
	 */
	public async count(): Promise<number> {

		let responses: object[] = await ECSQLDatabase.query(this.generateSQLCommand(true));
		let responseObject: object = responses[0];

		return responseObject["COUNT(*)"];
	}

	/**
	 * Check if the query returns any objects at all.
	 * @return {Promise<boolean>} A promise containing a boolean.
	 */
	public async exists(): Promise<boolean> {

		return (await this.count()) > 0;

	}

	/**
	 * Get an object with a specific id.
	 * @param type The class of the object.
	 * @param id The id of the object.
	 * @param allowUndefined Whether an error should be thrown if the object can not be found.
	 */
	public static async getObjectWithId<T extends ECSQLObject<P>, P extends ECSQLObjectPropType>(type: ECSQLQueryFactory<T, P>, id: string, allowUndefined?: boolean): Promise<T> {

		const table: string = (new type()).table;
		let query: ECSQLQuery<T, P> = new ECSQLQuery<T, P>(type, new ECSQLFilter("id", ECSQLOperator.Equal, id));
		query.setLimit(1);
		const items: ECArray<T> = await query.getAllObjects();
		const item: T = items.get(0);

		if (allowUndefined !== true && item === undefined) {

			throw ECErrorStack.newWithMessageAndType(
				ECErrorOriginType.FrontEnd,
				ECErrorType.NullOrUndefined,
				new Error(`Object '${table}' with id '${id}' does not exist.`)).withGenericError();

		} else return item;

	}


	public static async getObjectsWithIds<T extends ECSQLObject<P>, P extends ECSQLObjectPropType>(type: ECSQLQueryFactory<T, P>, ...ids: string[]): Promise<ECArray<T>> {

		let query: ECSQLQuery<T, P> = new ECSQLQuery<T, P>(type,  new ECSQLFilter("id", ECSQLOperator.ContainedIn,  ids));
		return await query.getAllObjects();

	}
}