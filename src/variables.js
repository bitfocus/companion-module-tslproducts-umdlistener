module.exports = {
	updateVariableDefinitions() {
		let variables = [
			{ label: 'Module State', name: 'module_state'},
		]

		for (let i = 0; i < this.TALLIES.length; i++) {
			variables.push( { label: `Tally ${this.TALLIES[i].address} Label`, name: `tally_${this.TALLIES[i].address}_label`});
			variables.push( { label: `Tally ${this.TALLIES[i].address} PVW`, name: `tally_${this.TALLIES[i].address}_pvw`});
			variables.push( { label: `Tally ${this.TALLIES[i].address} PGM`, name: `tally_${this.TALLIES[i].address}_pgm`});
		}

		this.setVariableDefinitions(variables);
	},

	checkVariables() {
		try {
			for (let i = 0; i < this.TALLIES.length; i++) {
				this.setVariable(`tally_${this.TALLIES[i].address}_label`, this.TALLIES[i].label);
				this.setVariable(`tally_${this.TALLIES[i].address}_pvw`, (this.TALLIES[i].tally1 == 1 ? 'True' : 'False'));
				this.setVariable(`tally_${this.TALLIES[i].address}_pgm`, (this.TALLIES[i].tally2 == 1 ? 'True' : 'False'));
			}
		}
		catch(error) {
			//do something with that error
			if (this.config.verbose) {
				this.log('debug', 'Error Updating Variables: ' + error);
			}
		}
	}
}