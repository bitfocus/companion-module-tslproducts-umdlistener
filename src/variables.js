module.exports = {
	initVariables() {
		let self = this;

		let variables = [
			{ name: 'Module State', variableId: 'module_state'},
		]

		for (let i = 0; i < self.TALLIES.length; i++) {
			variables.push( { name: `Tally ${self.TALLIES[i].address} Label`, variableId: `tally_${self.TALLIES[i].address}_label`});
			variables.push( { name: `Tally ${self.TALLIES[i].address} PVW`, variableId: `tally_${self.TALLIES[i].address}_pvw`});
			variables.push( { name: `Tally ${self.TALLIES[i].address} PGM`, variableId: `tally_${self.TALLIES[i].address}_pgm`});
		}

		self.setVariableDefinitions(variables);
	},

	checkVariables() {
		let self = this;
		
		try {
			let variableObj = {};

			for (let i = 0; i < self.TALLIES.length; i++) {
				variableObj[`tally_${self.TALLIES[i].address}_label`] = self.TALLIES[i].label;
				variableObj[`tally_${self.TALLIES[i].address}_pvw`] = (self.TALLIES[i].tally1 == 1 ? 'True' : 'False');
				variableObj[`tally_${self.TALLIES[i].address}_pgm`] = (self.TALLIES[i].tally2 == 1 ? 'True' : 'False');
			}

			self.setVariableValues(variableObj);
		}
		catch(error) {
			//do something with that error
			if (self.config.verbose) {
				self.log('debug', 'Error Updating Variables: ' + error);
			}
		}
	}
}