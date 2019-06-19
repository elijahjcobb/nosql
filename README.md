# nosql
A smart SQL database manager with easy and quick to use query and object management features.

## Import
Import all modules needed from the `@elijahjcobb/nosql` package.
```typescript
import { ECSQLObject } from "@elijahjcobb/nosql";
```

## Initialize
Everything in this package is promise based. So inside an `async` function call the static function `connect()` on the
`ECMDatabase` class.
```typescript
import { ECSQLDatabase } from "@elijahjcobb/nosql";

ECSQLDatabase.init({
	host: "localhost",
	port: 3306,
	username: "root",
	password: "",
	database: "testing",
	verbose: false,
	duplicateKeys: {
		"user_email_uindex": "email"
	}
});
```
#### Init Object Structure
| Key | Type | Optional | Default | Description |
| --- | --- | --- | --- | --- |
|`database`|`string`|`false`| `none` | The database to access on your SQL server. |
|`verbose`|`boolean` | `true` | `false` | Enabling verbose mode will log every event processed by this package. |
|`duplicateKeys`| `object` | `true` | `none` | You can specify a key and value for the duplicated column so that when a duplication occurs this package will through an error that is relevant for your situation. | 
|`host`| `string` | `true` | `localhost` | The host your SQL server is running on.|
|`port`|`number`|`true`|`3306`|The port your SQL server is running on.|
|`username`|`string`|`true`|`root`|The username for logging into your SQL server.|
|`password`|`string`|`true`|`none`|The password for logging into your SQL server.|

## Creating a Prototype
Create a class that extends the abstract class `ECSQLObject`. `ECSQLObject` requires a generic `Props` type. Make an interface that extends `ECSQLObjectPropType` and then use that interface as the
type for the `ECSQLObject`. Make sure to add a public constructor to your new class that calls
`super(table: string, types: ECSQLObjectTypes<Props>)`. That way to make a new object of your class you don't  need to supply anything in the constructor.

#### Example
```typescript
import { ECSQLObject, ECSQLObjectPropType } from "@elijahjcobb/nosql";

interface UserProps {
	name: string;
	age: number;
	password: Buffer;
}

class User extends ECSQLObject<UserProps> {
	
	public constructor() {
		
		super("userTable", {
			name: "string",
			age: "number",
			password: "buffer"
		});
		
	}
	
}
```
> In the example above a `User` class is created. Now you can easily do anything on your user. You can also write
functions on your `User` that only a `User` would have.

## Using a Prototype
Every prototype has a `props` property that conforms to the type you define. An object will have:
* `id: string`
* `updatedAt: number`
* `createdAt: number`
* `props: T`

#### Props
The props follows the interface you supply when making a class that extends `ECSQLObject`. Using the example from above
you can access different properties on the `User`.

```typescript
let user: User = new User();
user.props.name = "Elijah";
user.props.age = 20;
user.props.password = Buffer.alloc()
user.id; // the id of the user
user.updatedAt; // the timestamp the user was last updated
user.createdAt; // the timestamp the user created

await user.update();
await user.create();
await user.delete();
await user.fetch("id-goes-here");
await user.updateProps("name", "age");
```


#### Fetching an Object
You can use the `ECMQuery` to fetch an object. Pass the class of the object and the id and it will return a type safe
instance of the class for the given id.
```typescript
let user: User = await ECSQLQuery.getObjectWithId(User, "the-id-of-user");
```

## Query with `ECMQuery`

#### Create Query
To create a query, make a new instance of `ECSQLQuery` and pass the class of the object you will be querying and whether
all the filters should be queried as `AND` or `OR`;

#### Filters
You in the constructor for an `ECSQLQuery` you supply a factory but you also supply a filter which can be a `ECSQLFiler`
or an `ECSQLFilterGroup` instance. Filter groups are used to group filters by a common conditional. Check out the
example below...

#### Sort
You can sort the query by using the `setSort(<ECSQLSort>)` method that takes a `ECSQLSort` instance. To create a new instance,
provide a key that is a key of the props, and a sort direction.

#### Setting a Limit
Use the `setLimit(<number>)` function that takes a number to limit the amount of responses from the query.

#### Sending Query
You can use the `getAll()` or `getFirst()` methods that return promises of either the first object that matches the
query, or all objects that match the query.

#### Example
```typescript
let query: ECSQLQuery<User, UserProps> = new ECSQLQuery(User, new ECSQLFilterGroup(
	ECSQLCondition.And,
	new ECSQLFilter("age", ECSQLOperator.NotEqual, 51),
	new ECSQLFilterGroup(
		ECSQLCondition.Or,
		new ECSQLFilter("age", ECSQLOperator.Equal, 15),
		new ECSQLFilterGroup(
			ECSQLCondition.And,
			new ECSQLFilter("age", ECSQLOperator.LessThanOrEqual, 100),
			new ECSQLFilter("age", ECSQLOperator.GreaterThanOrEqual, 20)
		)
	)
));
```
> This example would return all users whose age is between 20 and 100 or whose age is 15 but not 51.

## Need more than default types?
If you need to use instances that are not `string`, `number`, `boolean`, `array`, `object`, or `buffer` that is now
since version `0.0.4`. Below is an example of how you can very easily support this.

#### Explanation
All you need to do is add the property on your class like you normally would. In the example below a `MyDate` date object is used.
Because the `MyDate` can be stored as a `string` which is one of the types supported by this package, you can override
the two methods in the class below. `overrideEncoding` and `overrideDecoding` are called after internal encoding and decoding
occur. So if you want to have your own `MyDate` for a birthday, you can simply set it and return `encoded`. Likewise, to
initialize the date, use the decoding method and set the value from the `row` that is provided.

#### Example
```typescript
class MyDate {
	
	public date: string;
	
	public constructor(date: string) {
		this.date = date;
	}
	
}

interface UserProps {
	firstName: string;
	birthday: string;
}

class User extends ECSQLObject<UserProps> {

	public birthday: MyDate | undefined;

	public constructor() {

		super("user", {
			firstName: "string",
			birthday: "string"
		});

	}

	public async overrideEncoding(encoded: ECSQLObjectRowOverride<UserProps>): Promise<ECSQLObjectRowOverride<UserProps>> {

		if (this.birthday) {

			encoded.set("birthday", this.birthday.date);

		}

		return encoded;

	}

	public async overrideDecoding(row: ECSQLObjectRow<UserProps>): Promise<void> {

		this.birthday = new MyDate(row.get("birthday") as string);

	}

}
``` 

## Testing
This package contains a `/tests` directory with some `jest` unit tests. If you find a bug please let me know and I will
fix the package! :)

## Documentation
Everything is completely documented. You can view the
[declaration files](https://github.com/elijahjcobb/nosql/tree/master/dist) or even the
[source code](https://github.com/elijahjcobb/nosql/tree/master/ts) on GitHub.

## Bugs
If you find any bugs please [create an issue on GitHub](https://github.com/elijahjcobb/nosql/issues) or if you are old
fashioned email me at [elijah@elijahcobb.com](mailto:elijah@elijahcobb.com).