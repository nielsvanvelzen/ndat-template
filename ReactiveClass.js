const ReactiveSymbols = {
	get: Symbol(),
	set: Symbol(),
	deleteProperty: Symbol(),
	ownKeys: Symbol(),
	has: Symbol(),
	defineProperty: Symbol(),
	getOwnPropertyDescriptor: Symbol(),
};

export class ReactiveClass {
	constructor() {
		this._observers = [];

		return new Proxy(this, {
			get: this[ReactiveSymbols.get],
			set: this[ReactiveSymbols.set],
			deleteProperty: this[ReactiveSymbols.deleteProperty],
			ownKeys: this[ReactiveSymbols.ownKeys],
			has: this[ReactiveSymbols.has],
			defineProperty: this[ReactiveSymbols.defineProperty],
			getOwnPropertyDescriptor: this[ReactiveSymbols.getOwnPropertyDescriptor],
		});
	}

	[ReactiveSymbols.get](obj, prop) {
		return prop === 'this' ? obj : obj[prop];
	}

	[ReactiveSymbols.set](obj, prop, val) {
		if (val === obj[prop]) return true;

		obj[prop] = val;

		if (!prop.startsWith('_')) for (let observer of obj._observers) observer(prop);

		return true;
	}

	[ReactiveSymbols.deleteProperty](obj, prop) {
		this[ReactiveSymbols.set](obj, prop, undefined);
		delete obj[prop];
	}

	observe(callback) {
		this._observers.push(callback);
	}
}