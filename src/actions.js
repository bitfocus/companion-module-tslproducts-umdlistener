module.exports = {
	initActions() {
		let self = this // required to have reference to outer `this`
		let actions = {}

		this.setActionDefinitions(actions)
	},
}
