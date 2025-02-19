/* eslint-disable no-nested-ternary */
/**
 * QuillForms Dependencies
 */
import useBlockTheme from '../../hooks/use-block-theme';

/**
 * WordPress Dependencies
 */
import { useRef, useEffect } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';

/**
 * External Dependencies
 */
import classnames from 'classnames';
import { css } from 'emotion';

/**
 * Internal Dependencies
 */
import { __experimentalUseFieldRenderContext } from '../field-render/context';
import FieldContent from '../field-content';
import { filter, findIndex } from 'lodash';
import useFormSettings from '../../hooks/use-form-settings';
import BlockAttachment from '../field-attachment';

let scrollTimer: ReturnType< typeof setTimeout >;
let tabTimer: ReturnType< typeof setTimeout >;

const FieldWrapper: React.FC = () => {
	const {
		id,
		isActive,
		shouldBeRendered,
		showErrMsg,
		next,
		attributes,
		blockName,
	} = __experimentalUseFieldRenderContext();

	const settings = useFormSettings();
	if ( ! id || ! blockName ) return null;
	const { blockType } = useSelect( ( select ) => {
		return {
			blockType: select( 'quillForms/blocks' ).getBlockType( blockName ),
		};
	} );

	if ( ! blockType ) return null;
	const { swiper, isValid, isFocused } = useSelect( ( select ) => {
		return {
			swiper: select( 'quillForms/renderer-core' ).getSwiperState(),
			isValid: blockType?.supports?.innerBlocks
				? select( 'quillForms/renderer-core' ).hasValidFields( id )
				: select( 'quillForms/renderer-core' ).isValidField( id ),
			isFocused: select( 'quillForms/renderer-core' ).isFocused(),
		};
	} );

	const { setSwiper, goNext, goPrev } = useDispatch(
		'quillForms/renderer-core'
	);

	const { walkPath, currentBlockId, isAnimating } = swiper;
	const setCanSwipeNext = ( val: boolean ) => {
		// if ( walkPath[ walkPath.length - 1 ].id === id ) val = false;
		setSwiper( {
			canSwipeNext: val,
		} );
	};
	const setCanSwipePrev = ( val: boolean ) => {
		setSwiper( {
			canSwipePrev: val,
		} );
	};
	const fieldIndex = walkPath.findIndex( ( field ) => field.id === id );

	const currentFieldIndex = walkPath.findIndex(
		( $field ) => $field.id === currentBlockId
	);

	const position = isActive
		? null
		: currentFieldIndex > fieldIndex
		? 'is-up'
		: 'is-down';

	const ref = useRef< HTMLDivElement | null >( null );

	useEffect( () => {
		if ( isActive ) {
			if ( ref?.current ) {
				setTimeout( () => {
					if ( ref?.current ) {
						ref.current.scrollTo( 0, 0 );
					}
				}, 0 );
			}
		} else {
			clearTimeout( tabTimer );
			clearTimeout( scrollTimer );
			setCanSwipeNext( true );
			setCanSwipePrev( true );
		}
	}, [ isActive ] );

	useEffect( () => {
		if ( isAnimating ) clearTimeout( tabTimer );
	}, [ isAnimating ] );

	const focusableElementsString =
		'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]';

	/**
	 * Gets all the focusable elements inside the passed element.
	 *
	 * @param  el
	 */
	function getFocusables( el ) {
		return filter(
			Array.prototype.slice.call(
				document
					.querySelector( el )
					.querySelectorAll( focusableElementsString )
			),
			( item ) => {
				return (
					item.getAttribute( 'tabindex' ) !== '-1' &&
					//are also not hidden elements (or with hidden parents)
					item.offsetParent !== null &&
					window.getComputedStyle( item ).visibility !== 'hidden'
				);
			}
		);
	}

	function processTab( isShiftPressed ) {
		if ( isAnimating ) {
			return;
		}
		const activeElement = document.activeElement;
		const focusableElements = getFocusables( `#block-${ id }` );
		//outside the block? Let's not hijack the tab!
		if ( ! isFocused ) {
			return;
		}

		const activeElementIndex = findIndex(
			focusableElements,
			( el ) => el === activeElement
		);

		// Happens when the active element is in the next block or previous block
		// This case occurs when pressing tab multiple times at the same time.
		if ( activeElementIndex === -1 ) {
			return;
		}
		if ( ! isShiftPressed ) {
			if (
				activeElement ==
				focusableElements[ focusableElements.length - 1 ]
			) {
				goNext();
			} else if (
				focusableElements[ activeElementIndex + 1 ].offsetParent !==
					null &&
				// If document element is still in dom
				// One example for this case is  the next button in each block if the block isn't valid and the error message
				// appear instead of the button. The button is focusable but it is no longer in dom.
				document.contains( focusableElements[ activeElementIndex + 1 ] )
			) {
				focusableElements[ activeElementIndex + 1 ].focus();
			} else {
				//when reached the last focusable element of the block, go next
				goNext();
			}
		} else {
			//when reached the first  focusable element of the block, go prev if shift is pressed
			if ( activeElementIndex === 0 ) {
				goPrev();
			} else if ( activeElementIndex === -1 ) {
				document.body.focus();
			} else {
				focusableElements[ activeElementIndex - 1 ].focus();
			}
		}
	}

	/**
	 * Makes sure the tab key will only focus elements within the current block  preventing this way from breaking the page.
	 * Otherwise, go next or prev.
	 *
	 * @param  e
	 * @param  isShiftPressed
	 */
	function onTab( e, isShiftPressed ) {
		clearTimeout( tabTimer );
		if ( isAnimating ) return;
		e.preventDefault();
		tabTimer = setTimeout( () => {
			processTab( isShiftPressed );
		}, 150 );
	}

	const scrollHandler = ( e ) => {
		if (
			settings?.disableWheelSwiping ||
			settings?.animationDirection === 'horizontal'
		) {
			return;
		}
		e.preventDefault();
		if ( ! ref.current ) return;
		if ( ref.current.scrollTop === 0 ) {
			scrollTimer = setTimeout( () => {
				setCanSwipePrev( true );
			}, 500 );
		} else {
			setCanSwipePrev( false );
		}
		// Adding tolerance to detect scroll end.
		// It was a problem with mobile devices.
		if (
			Math.abs(
				ref.current.scrollHeight -
					ref.current.clientHeight -
					ref.current.scrollTop
			) <= 3.0
		) {
			scrollTimer = setTimeout( () => {
				setCanSwipeNext( true );
			}, 500 );
		} else {
			setCanSwipeNext( false );
		}
	};
	const layout =
		blockType?.displayLayout && blockType?.displayLayout !== 'default'
			? blockType.displayLayout
			: attributes?.layout ?? 'stack';
	const theme = useBlockTheme( attributes?.themeId );
	let backgroundImageCSS = '';
	if ( theme.backgroundImage && theme.backgroundImage ) {
		backgroundImageCSS = `background-image: url('${
			theme.backgroundImage
		}');
			background-size: cover;
			background-position: ${
				// @ts-expect-error
				parseFloat( theme.backgroundImageFocalPoint?.x ) * 100
			}%
			${
				// @ts-expect-error
				parseFloat( theme.backgroundImageFocalPoint?.y ) * 100
			}%;
		`;
	}

	return (
		<div
			className={ classnames(
				'renderer-components-field-wrapper',
				{
					active: isActive,
					'is-animating': isAnimating,
					'is-horizontal-animation':
						settings?.animationDirection === 'horizontal',
				},
				`${ theme.typographyPreset }-typography-preset`,
				position ? position : '',
				css`
					font-family: ${ theme.font };
					@media ( min-width: 768px ) {
						font-size: ${ theme.fontSize.lg };
						line-height: ${ theme.fontLineHeight.lg };
					}
					@media ( max-width: 767px ) {
						font-size: ${ theme.fontSize.sm };
						line-height: ${ theme.fontLineHeight.sm };
					}
					textarea,
					input {
						font-family: ${ theme.font };
						font-size: ${ theme.textInputAnswers };
					}
					${ attributes?.themeId && backgroundImageCSS }
				`
			) }
		>
			<div
				className={ css`
					${ attributes?.themeId &&
					`background: ${ theme.backgroundColor }` };
					width: 100%;
					height: 100%;
				` }
			>
				{ shouldBeRendered && (
					<section
						id={ 'block-' + id }
						className={ classnames(
							`blocktype-${ blockName }-block`,
							`renderer-core-block-${ layout }-layout`,
							{
								'with-attachment':
									blockType?.supports.attachment,
							}
						) }
					>
						<div
							className="renderer-components-field-wrapper__content-wrapper"
							tabIndex={ 0 }
							// @ts-expect-error
							onKeyDown={ ( e: KeyboardEvent ): void => {
								const isShiftPressed = e.shiftKey;
								if ( isAnimating ) {
									e.preventDefault();
									return;
								}
								if ( e.key === 'Enter' ) {
									if ( isValid ) {
										next();
									} else {
										showErrMsg( true );
									}
								} else {
									//tab?
									if ( e.key === 'Tab' ) {
										e.stopPropagation();
										e.preventDefault();
										onTab( e, isShiftPressed );
									}
								}
							} }
						>
							<div
								ref={ ref }
								className="renderer-core-block-scroller"
								onScroll={ ( e ) => scrollHandler( e ) }
							>
								<FieldContent />
							</div>
						</div>
						{ layout !== 'stack' &&
							blockType?.supports?.attachment && (
								<div
									className={ classnames(
										'renderer-core-block-attachment-wrapper',
										css`
											img {
												object-position: ${
														// @ts-expect-error
														attributes
															?.attachmentFocalPoint
															?.x * 100
													 }%
													${
														// @ts-expect-error
														attributes
															?.attachmentFocalPoint
															?.y * 100
													 }%;
											}
										`
									) }
								>
									<BlockAttachment />
								</div>
							) }
					</section>
				) }
			</div>
		</div>
	);
};
export default FieldWrapper;
