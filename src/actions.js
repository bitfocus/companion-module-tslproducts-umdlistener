module.exports = {

	actions() {
		let self = this; // required to have reference to outer `this`
		let actionsArr = {};

		this.setActions(actionsArr);
	},
}
