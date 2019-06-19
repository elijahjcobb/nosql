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

/**
 *
 *
 *
 * Environment
 *
 *
 */

import {
	ECSQLCondition,
	ECSQLDatabase,
	ECSQLFilter,
	ECSQLFilterGroup,
	ECSQLObject, ECSQLObjectPropAcceptedValueType,
	ECSQLObjectPropType,
	ECSQLObjectRow,
	ECSQLObjectRowOverride,
	ECSQLOperator,
	ECSQLQuery,
	ECSQLSort
} from "..";
import * as Crypto from "crypto";
import { ECArray } from "@elijahjcobb/collections";


interface UserProps {
	firstName: string;
	lastName: string;
	email: string;
	age: number;
	isMale: boolean;
	birthday: string;
}

class MyDate {

	public day: string;

	public constructor(day: string) {
		this.day = day;
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

		if (this.birthday) {

			encoded.set("birthday", this.birthday.day);

		}

		return encoded;

	}

	public async overrideDecoding(row: ECSQLObjectRow<UserProps>): Promise<void> {

		this.birthday = new MyDate(row.get("birthday") as string);

	}

}

ECSQLDatabase.init({
	database: "nosql"
});

/**
 *
 *
 * TESTS
 *
 *
 */

describe("Initialization", () => {

	test("Creating Object", async () => {

		let u: User = new User();

		u.props.firstName = "Elijah";

		expect(u.props.firstName).toEqual("Elijah");

	});

});

describe("Undefined on Start", () => {

	test("Undefined ID", () => expect(new User().id).toEqual(undefined));
	test("Undefined Updated At", () => expect(new User().createdAt).toEqual(undefined));
	test("Undefined Created At", () => expect(new User().updatedAt).toEqual(undefined));

});

describe("Fetching Singular Objects", () => {

	test("Get Singular", async () => {

		let u: User = await ECSQLQuery.getObjectWithId(User, "EymHTmtUYbvC4KPn");

		expect(u.id).toBeDefined();
		expect(u.updatedAt).toBeDefined();
		expect(u.createdAt).toBeDefined();

	});

	test("Limit", async () => {

		const limit: number = 2;

		let query: ECSQLQuery<User, UserProps> = await new ECSQLQuery(User);
		query.setLimit(limit);
		let users: ECArray<User> = await query.getAllObjects();

		expect(users.size()).toEqual(limit);

	});

	test("Get All", async () => {

		let query: ECSQLQuery<User, UserProps> = await new ECSQLQuery(User);
		let users: ECArray<User> = await query.getAllObjects();

		users.forEach((u: User) => {

			expect(u.id).toBeDefined();
			expect(u.updatedAt).toBeDefined();
			expect(u.createdAt).toBeDefined();

		});

	});

});

describe("Mutating Objects", () => {

	test("Save", async () => {

		let u: User = new User();

		u.props.firstName = "John";
		u.props.lastName = "Doe";
		u.props.email = Crypto.randomBytes(8).toString("hex") + "@gmail.com";
		u.props.isMale = Math.round(Math.random()) === 1;
		u.props.age = 8;
		u.props.birthday = "3r2098u3r2";

		await u.create();

		expect(u.id).toBeDefined();
		expect(u.updatedAt).toBeDefined();
		expect(u.createdAt).toBeDefined();

	});

	test("Update Singular Property on Props", async () => {

		let u: User = await ECSQLQuery.getObjectWithId(User, "EymHTmtUYbvC4KPn");
		u.props.email = Crypto.randomBytes(8).toString("hex") + "@gmail.com";
		await u.updateProps("email");
		const uAgain: User = await ECSQLQuery.getObjectWithId(User, "EymHTmtUYbvC4KPn");

		expect(u.props.email).toEqual(uAgain.props.email);

	});

	test("Update Singular Property off Props", async () => {

		let u: User = await ECSQLQuery.getObjectWithId(User, "LyHRfFxeCTZtquMy");
		u.birthday = new MyDate(Crypto.randomBytes(4).toString("hex"));
		await u.updateProps("birthday");
		const uAgain: User = await ECSQLQuery.getObjectWithId(User, "LyHRfFxeCTZtquMy");

		expect(u.birthday.day).toEqual(uAgain.birthday.day);

	});

	test("Update All Properties via update()", async () => {

		let u: User = await ECSQLQuery.getObjectWithId(User, "EymHTmtUYbvC4KPn");
		u.props.email = Crypto.randomBytes(8).toString("hex") + "@gmail.com";
		await u.update();
		const uAgain: User = await ECSQLQuery.getObjectWithId(User, "EymHTmtUYbvC4KPn");

		expect(u.props.email).toEqual(uAgain.props.email);

	});

	test("Update All Properties via save()", async () => {

		let u: User = await ECSQLQuery.getObjectWithId(User, "EymHTmtUYbvC4KPn");
		u.props.email = Crypto.randomBytes(8).toString("hex") + "@gmail.com";
		await u.save();
		const uAgain: User = await ECSQLQuery.getObjectWithId(User, "EymHTmtUYbvC4KPn");

		expect(u.props.email).toEqual(uAgain.props.email);

	});

});

describe("Queries", () => {

	test("Sorts & Filters", async () => {

		let query: ECSQLQuery<User, UserProps> = new ECSQLQuery(User, new ECSQLFilter("age", ECSQLOperator.GreaterThanOrEqual, 40));

		query.setSort(new ECSQLSort("age"));

		let users: ECArray<User> = await query.getAllObjects();
		let ages: ECArray<string> = users.map((user: User): string => {

			return user.props.firstName;
		});

		expect(ages.toNativeArray()).toEqual(["Laura", "Jeffrey"]);

	});

	test("Count", async() => {

		let query: ECSQLQuery<User, UserProps> = new ECSQLQuery(User, new ECSQLFilter("firstName", ECSQLOperator.Equal, "Elijah"));
		let users: ECArray<User> = await query.getAllObjects();
		const count: number = await query.count();

		expect(count).toEqual(1);

	});

	test("Filter Groups", async () => {

		let query: ECSQLQuery<User, UserProps> = new ECSQLQuery(User, new ECSQLFilterGroup(
			ECSQLCondition.Or,
			new ECSQLFilterGroup(
				ECSQLCondition.And,
				new ECSQLFilter("age", ECSQLOperator.LessThanOrEqual, 50),
				new ECSQLFilter("age", ECSQLOperator.GreaterThanOrEqual, 18),
				new ECSQLFilter("isMale", ECSQLOperator.Equal, true)
			),
			new ECSQLFilterGroup(
				ECSQLCondition.And,
				new ECSQLFilter("age", ECSQLOperator.LessThanOrEqual, 18),
				new ECSQLFilter("age", ECSQLOperator.GreaterThanOrEqual, 10),
				new ECSQLFilter("isMale", ECSQLOperator.Equal, false)
			)
		));

		query.setSort(new ECSQLSort("age"));

		let users: ECArray<User> = await query.getAllObjects();
		let ages: ECArray<string> = users.map((user: User): string => {

			return user.props.firstName;
		});

		expect(ages.toNativeArray()).toEqual(["Ari", "Elijah"]);

	});


});

describe("Deleting", () => {


	test("Delete", async () => {

		let u: User = new User();

		u.props.firstName = "John";
		u.props.lastName = "Doe";
		u.props.email = Crypto.randomBytes(8).toString("hex") + "@gmail.com";
		u.props.isMale = Math.round(Math.random()) === 1;
		u.props.age = 8;
		u.birthday = new MyDate("060399");

		await u.create();
		const id: string = u.id;
		await u.delete();

		const deletedU: User | undefined = await ECSQLQuery.getObjectWithId(User, id, true);
		expect(deletedU).toEqual(undefined);

	});

	test("Delete All", async() => {

		let query: ECSQLQuery<User, UserProps> = new ECSQLQuery(User, new ECSQLFilter("firstName", ECSQLOperator.Equal, "John"));
		let users: ECArray<User> = await query.getAllObjects();
		await users.forEachSync(async (user: User) => await user.delete());
		const count: number = await query.count();

		expect(count).toEqual(0);

	});

});