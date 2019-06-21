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

import { ECErrorOriginType, ECErrorStack, ECErrorType } from "@elijahjcobb/error";
import { ECArrayList, ECDictionary, ECMap } from "@elijahjcobb/collections";
import { ECSQLDatabase } from "../ECSQLDatabase";
import { ECGenerator } from "@elijahjcobb/encryption";
import { ECSQLCMD, ECSQLCMDQuery } from "@elijahjcobb/sql-cmd";

/**
 * Types
 */
export type ECSQLObjectPropAcceptedValueType = string | number | boolean | any[] | object | Buffer | undefined;
export type ECSQLObjectRowAcceptedKeyType<Props> = keyof Props | "id" | "updatedAt" | "createdAt";
export type ECSQLObjectRowAcceptedValueType = string | number | boolean | Buffer;
export type ECSQLObjectRow<Props> = ECDictionary<ECSQLObjectRowAcceptedKeyType<Props>, ECSQLObjectRowAcceptedValueType>;
export type ECSQLObjectRowOverride<Props> = ECMap<ECSQLObjectRowAcceptedKeyType<Props>, ECSQLObjectRowAcceptedValueType>;
export type ECSQLObjectTypes<T> = { [key in keyof T]: ECSQLValue };
export type ECSQLObjectPropType = { [key: string]: any; };
export type ECSQLObjectPropTypeUndefined<T> = { [P in keyof T]: (T[P] | undefined); };
export type ECSQLValue = "string" | "number" | "boolean" | "array" | "object" | "buffer";
export enum ECSQLNotification {
	Created = "Created",
	Updated = "Updated",
	Deleted = "Deleted",
	Encoded = "Encoded",
	Decoded = "Decoded"
}

/**
 * An abstract class to extend. It takes a interface as a generic property.
 */
export abstract class ECSQLObject<Props extends ECSQLObjectPropType> {

	public readonly table: string;
	public readonly types: ECSQLObjectTypes<Props>;
	public id: string | undefined;
	public updatedAt: number | undefined;
	public createdAt: number | undefined;
	public props: ECSQLObjectPropTypeUndefined<Props> = {} as ECSQLObjectPropTypeUndefined<Props>;

	/**
	 * Called as super() from a child.
	 * @param table The table the child belongs to.
	 * @param types The types the child requires.
	 */
	protected constructor(table: string, types: ECSQLObjectTypes<Props>) {

		this.table = table;
		this.types = types;

	}

	/**
	 * Handles notifications and optional overriding functions.
	 * @param notification The notification type.
	 */
	private handleNotification(notification: ECSQLNotification): Promise<void> {

		if (ECSQLDatabase.verbose) console.log(`${notification} '${this.table}' with id: '${this.id}'.`);

		switch (notification) {
			case ECSQLNotification.Created:
				return this.objectDidCreate();
			case ECSQLNotification.Decoded:
				return this.objectDidDecode();
			case ECSQLNotification.Deleted:
				return this.objectDidDelete();
			case ECSQLNotification.Encoded:
				return this.objectDidEncode();
			case ECSQLNotification.Updated:
				return this.objectDidUpdate();
		}

	}

	/**
	 * Called after an object is created for the first time.
	 */
	protected async objectDidCreate(): Promise<void> {}

	/**
	 * Called after an object is updated.
	 */
	protected async objectDidUpdate(): Promise<void> {}

	/**
	 * Called after an object is deleted.
	 */
	protected async objectDidDelete(): Promise<void> {}

	/**
	 * Called after an object is encoded.
	 */
	protected async objectDidEncode(): Promise<void> {}

	/**
	 * Called after an object is decoded.
	 */
	protected async objectDidDecode(): Promise<void> {}

	public toJSON(): object {

		let json: object = this.props;

		json["id"] = this.id;
		json["updatedAt"] = this.updatedAt;
		json["createdAt"] = this.createdAt;

		return json;

	}

	/**
	 * Encodes an object and its properties into a data structure applicable for a SQL row.
	 */
	public async encode(): Promise<ECSQLObjectRow<Props>> {

		await this.overrideEncoding();

		let map: ECMap<ECSQLObjectRowAcceptedKeyType<Props>, ECSQLObjectRowAcceptedValueType> = new ECMap<ECSQLObjectRowAcceptedKeyType<Props>, ECSQLObjectRowAcceptedValueType>();
		let types: ECSQLObjectTypes<Props> = this.types;
		let keys: (keyof Props)[] = Object.keys(types);

		for (let i: number = 0; i < keys.length; i ++) {

			const key: (keyof Props) = keys[i];
			const type: ECSQLValue = types[key];
			let value: any = this.props[key];


			if (type === "number" || type === "boolean") {

				if (type === "boolean") map.set(key, value ? 1 : 0);
				else map.set(key, value);

			} else if (type === "array" || type === "object") {

				let data: Buffer;

				try {

					const valueAsString: string = JSON.stringify(value);
					data = Buffer.from(valueAsString, "utf8");

				} catch (e) {

					ECSQLObject.handleInternalError(`Failed to convert ${key} of type ${type} to a Buffer.`);

				}

				try {

					value = data.toString("hex");

				} catch (e) {

					ECSQLObject.handleInternalError(`Failed to convert ${key} of type ${type} to a string for encoding.`);

				}

				map.set(key, value);

			} else {

				map.set(key, value);

			}

		}

		map.set("id", this.id);
		map.set("updatedAt", this.updatedAt);
		map.set("createdAt", this.createdAt);

		await this.handleNotification(ECSQLNotification.Encoded);

		return map.toDictionary();

	}

	/**
	 * Decodes a SQL table row into this object.
	 * @param row
	 */
	public async decode(row: ECSQLObjectRow<Props>): Promise<void> {

		const types: ECSQLObjectTypes<Props> = this.types;
		let keys: (keyof Props)[] = Object.keys(types);
		keys.push("id", "updatedAt", "createdAt");
		keys = keys as ECSQLObjectRowAcceptedKeyType<Props>[];

		this.props = {} as ECSQLObjectPropTypeUndefined<Props>;

		for (let i: number = 0; i < keys.length; i ++) {

			const key: ECSQLObjectRowAcceptedKeyType<Props> = keys[i];
			const type: ECSQLValue = types[key];
			let value: any = row.get(key);

			if (key === "id" || key === "updatedAt" || key === "createdAt") {

				if (key === "id") this.id = value;
				else if (key === "updatedAt") this.updatedAt = value;
				else if (key === "createdAt") this.createdAt = value;

			} else {

				if (type === "boolean") {

					// @ts-ignore
					this.props[key] = value === 1;

				} else if (type === "array" || type === "object" || type === "buffer") {

					let data: Buffer;

					try {

						data = Buffer.from(value, "hex");

					} catch (e) {

						ECSQLObject.handleInternalError(`Failed to convert ${key} of type ${type} to a Buffer.`);

					}

					if (type === "array" || type === "object") {

						try {

							const valueAsString: string = data.toString("utf8");
							this.props[key] = JSON.parse(valueAsString);

						} catch (e) {

							ECSQLObject.handleInternalError(`Failed to convert ${key} of type ${type} to a Buffer.`);

						}

					} else {

						// @ts-ignore
						this.props[key] = data;

					}

				} else {

					this.props[key] = value;

				}

			}

			if (this.props[key] === null) this.props[key] = undefined;

		}

		await this.overrideDecoding();
		await this.handleNotification(ECSQLNotification.Decoded);

	}

	/**
	 * You may override the two following methods to allow custom properties on your class. Just make a prop on
	 * your object that is a base type that your objects can conform to. In these functions, set to and pull from
	 * the props with your own properties.
	 */
	public async overrideEncoding(): Promise<void> {}
	public async overrideDecoding(): Promise<void> {}

	/**
	 * Pretty prints this object into the console.
	 */
	public print(): void {

		let properties: string[] = [];

		const keys: string[] = Object.keys(this.props);
		for (let i: number = 0; i < keys.length; i ++) {

			const key: string = keys[i];
			const value: any = this.props[key];
			let valueToUse: string;

			if (typeof value === "string") {

				valueToUse = `"${value}"`;

			} else if (typeof value === "boolean" || typeof value === "number") {

				valueToUse = "" + value;

			} else if (typeof value === "object") {

				if (Buffer.isBuffer(value)) {

					try {
						valueToUse = "<hex: " + (value as Buffer).toString("hex") + ">";
					} catch (e) {
						valueToUse = "";
					}

				} else {

					try {
						valueToUse = JSON.stringify(value);
					} catch (e) {
						valueToUse = "";
					}

				}

			}

			properties.push(`${key} = ${valueToUse}`);

		}

		console.log(`ESQLObject '${this.table}' with ID: ${this.id} {
		Updated At: ${this.updatedAt}
		Created At: ${this.createdAt}
		Properties: {
		\t${properties.join("\n\t\t\t")}
		}\n}`);

	}

	/**
	 * Create this instance in the table.
	 */
	public async create(): Promise<void> {

		if (this.id !== undefined && this.id !== null) {

			console.log(this.id);

			let stack: ECErrorStack = ECErrorStack.newWithMessageAndType(
				ECErrorOriginType.BackEnd,
				ECErrorType.InvalidRequest,
				new Error(`You cannot create a ${this.table} that already exists in the database.`));
			stack.addGenericError();

			throw stack;

		}

		let recurseCount: number = 0;

		let createProcess: () => Promise<string> = async (): Promise<string> => {

			this.updatedAt = Date.now();
			this.createdAt = Date.now();
			this.id = ECGenerator.randomId();

			let map: ECSQLObjectRow<Props> = await this.encode();
			let newID: string = ECGenerator.randomId();

			let cmd: ECSQLCMD = ECSQLCMD.insert(this.table);
			map.forEach((key: string, value: ECSQLValue) => cmd.set(key, value));

			try {

				await ECSQLDatabase.query(cmd.generate());

			} catch (e) {

				if (typeof e === "boolean") {

					recurseCount ++;

					if (recurseCount > 100) {

						let stack: ECErrorStack = ECErrorStack.newWithMessageAndType(ECErrorOriginType.SQLServer, ECErrorType.InternalSQLError, new Error("ECSQLObject create recursed more than 100 times."));
						stack.addGenericError();

						throw stack;

					}

					return await createProcess();

				} else {

					throw e;

				}

			}

			return newID;

		};

		this.id = await createProcess();
		this.createdAt = Date.now();
		this.updatedAt = Date.now();

		await this.handleNotification(ECSQLNotification.Created);

	}

	/**
	 * Update all properties on this instance.
	 */
	public async update(): Promise<void> {

		if (!this.id) {

			let stack: ECErrorStack = ECErrorStack.newWithMessageAndType(ECErrorOriginType.BackEnd, ECErrorType.InvalidRequest, new Error(`You cannot update a ${this.table} that does not exist in the database.`));
			stack.addGenericError();

			throw stack;

		}

		this.updatedAt = Date.now();

		let map: ECSQLObjectRow<Props> = await this.encode();
		let cmd: ECSQLCMD = ECSQLCMD.update(this.table).where("id", "=", this.id);
		map.forEach((key: string, value: ECSQLValue) => cmd.set(key, value));

		await ECSQLDatabase.query(cmd.generate());
		await this.handleNotification(ECSQLNotification.Updated);

	}

	/**
	 * Update properties provided from this instance.
	 * @param keys
	 */
	public async updateProps(...keys: (keyof Props)[]): Promise<void> {

		if (!this.id) {

			let stack: ECErrorStack = ECErrorStack.newWithMessageAndType(ECErrorOriginType.BackEnd, ECErrorType.InvalidRequest, new Error(`You cannot update a ${this.table} that does not exist in the database.`));
			stack.addGenericError();

			throw stack;

		}

		this.updatedAt = Date.now();
		if (keys.indexOf("updatedAt") === -1) keys.push("updatedAt");

		let map: ECSQLObjectRow<Props> = await this.encode();
		let cmd: ECSQLCMD = ECSQLCMD.update(this.table).where("id", "=", this.id);
		for (let key of keys) cmd = cmd.set(key as string, map.get(key));

		await ECSQLDatabase.query(cmd.generate());
		await this.handleNotification(ECSQLNotification.Updated);

	}

	/**
	 * Updated this instances updatedAt to the current time.
	 */
	public fireUpdatedAt(): Promise<void> {

		return this.updateProps("updatedAt");

	}

	/**
	 * Intelligently creates or updates an object depending on this instances current state.
	 */
	public save(): Promise<void> {

		if (this.id) return this.update();
		else return this.create();

	}

	/**
	 * Deletes this instance in the table.
	 */
	public async delete(): Promise<void> {

		if (!this.id) {

			let stack: ECErrorStack = ECErrorStack.newWithMessageAndType(ECErrorOriginType.BackEnd, ECErrorType.InvalidRequest, new Error(`You cannot delete a ${this.table} that does not exist in the database.`));
			stack.addGenericError();

			throw stack;

		}

		let command: string = ECSQLCMD.delete(this.table).where("id", "=", this.id).generate();
		await ECSQLDatabase.query(command);

		await this.handleNotification(ECSQLNotification.Deleted);
		this.id = undefined;

	}

	/**
	 * Handles errors that occur during different processes.
	 * @param error
	 */
	private static handleInternalError(error: any): void {

		let message: string = "Internal error.";

		if (error instanceof Error) {

			message = error.message;

		} else if (typeof error === "string") {

			message = error;

		}

		throw ECErrorStack.newWithMessageAndType(ECErrorOriginType.SQLServer, ECErrorType.InternalSQLError, new Error(message)).withGenericError();

	}

}