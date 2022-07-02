import ConfigApi from '@quillforms/config';

const getInitialState = () => {
	let state = {
		enabled: false,
		currency: { code: 'USD', symbol_pos: 'left' },
		models: {
			[ randomId() ]: getModelDefaultState( 'Payment Model #1' ),
		},
		products: {},
		errors: {
			products: {},
		},
	};

	if ( isObject( ConfigApi.getInitialPayload().payments ) ) {
		state = { ...state, ...ConfigApi.getInitialPayload().payments };
	}

	if ( isObject( ConfigApi.getInitialPayload().products ) ) {
		state = { ...state, products: ConfigApi.getInitialPayload().products };
	}

	return state;
};

const getModelDefaultState = ( name ) => {
	return {
		name,
		recurring: false,
		methods: {},
		options: {
			gateways: {},
		},
		conditions: false,
	};
};

const randomId = () => {
	return Math.random().toString( 36 ).substring( 2, 8 );
};

const isObject = ( variable ) => {
	return (
		typeof variable === 'object' &&
		variable !== null &&
		! Array.isArray( variable )
	);
};

export { getInitialState, getModelDefaultState, randomId, isObject };
