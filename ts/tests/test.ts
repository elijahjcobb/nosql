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

import {
	ECSQLDatabase,
	ECSQLObject,
	ECSQLObjectRow,
	ECSQLObjectRowOverride,
	ECSQLQuery,
} from "..";


interface UserProps {
	firstName: string;
	lastName: string;
	email: string;
	age: number;
	isMale: boolean;
	birthday: string;
}

class MyDate {

	private day: string;

	public constructor(day: string) {

		this.day = day;

	}

	public getDay(): string {

		return this.day;

	}

}

class User extends ECSQLObject<UserProps> {

	public birthday: MyDate | undefined;

	public constructor() {

		super("user", {
			firstName: "string",
			lastName: "string",
			email: "string",
			age: "number",
			isMale: "boolean",
			birthday: "string"
		});

	}

	public async overrideEncoding(encoded: ECSQLObjectRowOverride<UserProps>): Promise<ECSQLObjectRowOverride<UserProps>> {

		if (this.birthday) encoded.set("birthday", `'${this.birthday.getDay()}'`);
		else encoded.set("birthday", null);

		return encoded;

	}

	public async overrideDecoding(row: ECSQLObjectRow<UserProps>): Promise<void> {

		this.birthday = new MyDate(row.get("birthday") as string);

	}

}

ECSQLDatabase.init({
	database: "nosql",
	verbose: true
});

(async (): Promise<void> => {




})().then(() => {}).catch((err: any) => err.print());