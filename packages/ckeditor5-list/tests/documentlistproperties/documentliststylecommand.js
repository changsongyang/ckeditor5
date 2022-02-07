/**
 * @license Copyright (c) 2003-2022, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

import { setData, getData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model';
import VirtualTestEditor from '@ckeditor/ckeditor5-core/tests/_utils/virtualtesteditor';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import DocumentListPropertiesEditing from '../../src/documentlistproperties/documentlistpropertiesediting';
import { modelList } from '../documentlist/_utils/utils';
import stubUid from '../documentlist/_utils/uid';

describe( 'DocumentListStyleCommand', () => {
	let editor, model, bulletedListCommand, numberedListCommand, listStyleCommand, stub;

	beforeEach( async () => {
		const newEditor = await VirtualTestEditor.create( {
			plugins: [ Paragraph, DocumentListPropertiesEditing ]
		} );
		editor = newEditor;
		model = editor.model;
		bulletedListCommand = editor.commands.get( 'bulletedList' );
		numberedListCommand = editor.commands.get( 'numberedList' );
		listStyleCommand = editor.commands.get( 'listStyle' );

		stub = stubUid();
	} );

	afterEach( () => {
		stub.restore();

		return editor.destroy();
	} );

	describe( '#isEnabled', () => {
		it( 'should be true if bulletedList or numberedList is enabled', () => {
			bulletedListCommand.isEnabled = true;
			numberedListCommand.isEnabled = false;
			listStyleCommand.refresh();

			expect( listStyleCommand.isEnabled ).to.equal( true );

			bulletedListCommand.isEnabled = false;
			numberedListCommand.isEnabled = true;
			listStyleCommand.refresh();

			expect( listStyleCommand.isEnabled ).to.equal( true );
		} );

		it( 'should be false if bulletedList and numberedList are disabled', () => {
			bulletedListCommand.isEnabled = false;
			numberedListCommand.isEnabled = false;

			listStyleCommand.refresh();

			expect( listStyleCommand.isEnabled ).to.equal( false );
		} );
	} );

	describe( '#value', () => {
		it( 'should return null if selected a paragraph', () => {
			setData( model, '<paragraph>Foo[]</paragraph>' );

			expect( listStyleCommand.value ).to.equal( null );
		} );

		it( 'should return null if selection starts in a paragraph and ends in a list item', () => {
			setData( model, modelList( `
				Fo[o
				* Bar]
			` ) );

			expect( listStyleCommand.value ).to.equal( null );
		} );

		it( 'should return the value of `listStyle` attribute if selection is inside a list item (collapsed selection)', () => {
			setData( model, modelList( [ '* Foo[] {style:circle}' ] ) );

			expect( listStyleCommand.value ).to.equal( 'circle' );
		} );

		it( 'should return the value of `listStyle` attribute if selection is inside a list item (non-collapsed selection)', () => {
			setData( model, modelList( [ '* [Foo] {style:square}' ] ) );

			expect( listStyleCommand.value ).to.equal( 'square' );
		} );

		it( 'should return the value of `listStyle` attribute if selected more elements in the same list', () => {
			setData( model, modelList( `
				* [1. {style:square}
				* 2.]
				* 3.
			` ) );

			expect( listStyleCommand.value ).to.equal( 'square' );
		} );

		it( 'should return the value of `listStyle` attribute for the selection inside a nested list', () => {
			setData( model, modelList( `
				* 1. {style:square}
				  * 1.1.[] {style:disc}
				* 2.
			` ) );

			expect( listStyleCommand.value ).to.equal( 'disc' );
		} );

		it( 'should return the value of `listStyle` attribute from a list where the selection starts (selection over nested list)', () => {
			setData( model, modelList( `
				* 1. {style:square}
				  * 1.1.[ {style:disc}
				* 2.]
			` ) );

			expect( listStyleCommand.value ).to.equal( 'disc' );
		} );
	} );

	describe( 'execute()', () => {
		it( 'should set the `listStyle` attribute for collapsed selection', () => {
			setData( model, modelList( [ '* 1.[] {style:square}' ] ) );

			listStyleCommand.execute( { type: 'circle' } );

			expect( getData( model ) ).to.equalMarkup( modelList( [ '* 1.[] {style:circle}' ] ) );
		} );

		it( 'should set the `listStyle` attribute for non-collapsed selection', () => {
			setData( model, modelList( [ '* [1.] {style:disc}' ] ) );

			listStyleCommand.execute( { type: 'circle' } );

			expect( getData( model ) ).to.equalMarkup( modelList( [ '* [1.] {style:circle}' ] ) );
		} );

		it( 'should set the `listStyle` attribute for all the same list items (collapsed selection)', () => {
			setData( model, modelList( `
				* 1. {style:square}
				* 2.[]
				* 3.
			` ) );

			listStyleCommand.execute( { type: 'circle' } );

			expect( getData( model ) ).to.equalMarkup( modelList( `
				* 1. {style:circle}
				* 2.[]
				* 3.
			` ) );
		} );

		it( 'should set the `listStyle` attribute for all the same list items and ignores nested lists (collapsed selection)', () => {
			setData( model, modelList( `
				* 1.[] {style:square}
				* 2.
				  * 2.1. {style:disc}
				  * 2.2
				* 3.
				  * 3.1. {style:disc}
			` ) );

			listStyleCommand.execute( { type: 'circle' } );

			expect( getData( model ) ).to.equalMarkup( modelList( `
				* 1.[] {style:circle}
				* 2.
				  * 2.1. {style:disc}
				  * 2.2
				* 3.
				  * 3.1. {style:disc}
			` ) );
		} );

		it( 'should set the `listStyle` attribute for all the same list items and ignores "parent" list (selection in nested list)', () => {
			setData( model, modelList( `
				* 1. {style:square}
				* 2.
				  * 2.1.[] {style:square}
				  * 2.2.
				* 3.
				  * 3.1. {style:square}
			` ) );

			listStyleCommand.execute( { type: 'disc' } );

			expect( getData( model ) ).to.equalMarkup( modelList( `
				* 1. {style:square}
				* 2.
				  * 2.1.[] {style:disc}
				  * 2.2.
				* 3.
				  * 3.1. {style:square}
			` ) );
		} );

		it( 'should stop searching for the list items when spotted non-listItem element', () => {
			setData( model, modelList( `
				Foo.
				* 1.[] {style:default}
				* 2.
				* 3.
			` ) );

			listStyleCommand.execute( { type: 'circle' } );

			expect( getData( model ) ).to.equalMarkup( modelList( `
				Foo.
				* 1.[] {style:circle}
				* 2.
				* 3.
			` ) );
		} );

		it( 'should stop searching for the list items when spotted listItem with different listType attribute', () => {
			setData( model, modelList( `
				Foo.
				* 1.[] {style:default}
				* 2.
				# 1. {style:default}
			` ) );

			listStyleCommand.execute( { type: 'circle' } );

			expect( getData( model ) ).to.equalMarkup( modelList( `
				Foo.
				* 1.[] {style:circle}
				* 2.
				# 1. {style:default}
			` ) );
		} );

		it( 'should stop searching for the list items when spotted listItem with different listStyle attribute', () => {
			setData( model, modelList( `
				Foo.
				* 1.[] {style:default}
				* 2.
				* 3. {style:disc}
			` ) );

			listStyleCommand.execute( { type: 'circle' } );

			expect( getData( model ) ).to.equalMarkup( modelList( `
				Foo.
				* 1.[] {style:circle}
				* 2.
				* 3. {style:disc}
			` ) );
		} );

		it( 'should only set the `listStyle` attribute for selected items (non-collapsed selection)', () => {
			setData( model, modelList( `
				* 1. {style:disc}
				* 2a.
				  [2b.
				  2c.
				* 3a].
				  3b.
				* 4.
			` ) );

			listStyleCommand.execute( { type: 'circle' } );

			expect( getData( model ) ).to.equalMarkup( modelList( `
				* 1. {style:disc}
				* 2a. {style:circle}
				  [2b.
				  2c.
				* 3a].
				  3b.
				* 4. {style:disc}
			` ) );
		} );

		it( 'should only set the `listStyle` attribute for all blocks in the list item (non-collapsed selection)', () => {
			setData( model, modelList( `
				* 1. {style:disc}
				* [2.
				* 3].
				* 4.
			` ) );

			listStyleCommand.execute( { type: 'circle' } );

			expect( getData( model ) ).to.equalMarkup( modelList( `
				* 1. {style:disc}
				* [2. {style:circle}
				* 3].
				* 4. {style:disc}
			` ) );
		} );

		it( 'should set the `listStyle` attribute for selected items including nested lists (non-collapsed selection)', () => {
			// [x] = items that should be updated.
			// All list items that belong to the same lists that selected items should be updated.
			// "2." is the most outer list (listIndent=0)
			// "2.1" a child list of the "2." element (listIndent=1)
			// "2.1.1" a child list of the "2.1" element (listIndent=2)
			//
			// [ ] ■ 1.
			// [x] ■ [2.
			// [x]     ○ 2.1.
			// [X]         ▶ 2.1.1.]
			// [ ]         ▶ 2.1.2.
			// [ ]     ○ 2.2.
			// [ ] ■ 3.
			// [ ]     ○ 3.1.
			// [ ]         ▶ 3.1.1.
			//
			// "3.1" is not selected and this list should not be updated.
			setData( model, modelList( `
				* 1. {style:square}
				* [2.
				  * 2.1. {style:circle}
				    * 2.1.1.] {style:square}
					* 2.1.2.
				  * 2.2.
				* 3.
				  * 3.1. {style:square}
				    * 3.1.1. {style:square}
			` ) );

			listStyleCommand.execute( { type: 'disc' } );

			expect( getData( model ) ).to.equalMarkup( modelList( `
				* 1. {style:square}
				* [2. {style:disc}
				  * 2.1. {style:disc}
				    * 2.1.1.] {style:disc}
				    * 2.1.2. {style:square}
				  * 2.2. {style:circle}
				* 3. {style:square}
				  * 3.1. {style:square}
				    * 3.1.1. {style:square}
			` ) );
		} );

		it( 'should use default type if not specified (no options passed)', () => {
			setData( model, modelList( [ '* 1.[] {style:circle}' ] ) );

			listStyleCommand.execute();

			expect( getData( model ) ).to.equalMarkup( modelList( [ '* 1.[] {style:default}' ] ) );
		} );

		it( 'should use default type if not specified (passed an empty object)', () => {
			setData( model, modelList( [ '* 1.[] {style:circle}' ] ) );

			listStyleCommand.execute( {} );

			expect( getData( model ) ).to.equalMarkup( modelList( [ '* 1.[] {style:default}' ] ) );
		} );

		it( 'should use default type if not specified (passed null as value)', () => {
			setData( model, modelList( [ '* 1.[] {style:circle}' ] ) );

			listStyleCommand.execute( { type: null } );

			expect( getData( model ) ).to.equalMarkup( modelList( [ '* 1.[] {style:default}' ] ) );
		} );

		it( 'should create a list list if no listItem found in the selection (circle, non-collapsed selection)', () => {
			setData( model, modelList( `
				[Foo.
				Bar.]
			` ) );

			const listCommand = editor.commands.get( 'bulletedList' );
			const spy = sinon.spy( listCommand, 'execute' );

			listStyleCommand.execute( { type: 'circle' } );

			expect( getData( model ) ).to.equalMarkup( modelList( `
				* [Foo. {style:circle} {id:a00}
				* Bar.] {id:a01}
			` ) );

			expect( spy.called ).to.be.true;

			spy.restore();
		} );

		it( 'should create a list list if no listItem found in the selection (square, collapsed selection)', () => {
			setData( model, modelList( `
				Fo[]o.
				Bar.
			` ) );

			const listCommand = editor.commands.get( 'bulletedList' );
			const spy = sinon.spy( listCommand, 'execute' );

			listStyleCommand.execute( { type: 'circle' } );

			expect( getData( model ) ).to.equalMarkup( modelList( `
				* Fo[]o. {id:a00} {style:circle}
				Bar.
			` ) );

			expect( spy.called ).to.be.true;

			spy.restore();
		} );

		it( 'should create a list list if no listItem found in the selection (decimal, non-collapsed selection)', () => {
			setData( model, modelList( `
				[Foo.
				Bar.]
			` ) );

			const listCommand = editor.commands.get( 'numberedList' );
			const spy = sinon.spy( listCommand, 'execute' );

			listStyleCommand.execute( { type: 'decimal' } );

			expect( getData( model ) ).to.equalMarkup( modelList( `
				# [Foo. {id:a00} {style:decimal}
				# Bar.] {id:a01}
			` ) );

			expect( spy.called ).to.be.true;

			spy.restore();
		} );

		it( 'should create a list list if no listItem found in the selection (upper-roman, collapsed selection)', () => {
			setData( model, modelList( `
				Fo[]o.
				Bar.
			` ) );

			const listCommand = editor.commands.get( 'numberedList' );
			const spy = sinon.spy( listCommand, 'execute' );

			listStyleCommand.execute( { type: 'upper-roman' } );

			expect( getData( model ) ).to.equalMarkup( modelList( `
				# Fo[]o. {id:a00} {style:upper-roman}
				Bar.
			` ) );

			expect( spy.called ).to.be.true;

			spy.restore();
		} );

		it( 'should not update anything if no listItem found in the selection (default style)', () => {
			setData( model, modelList( `
				Foo.[]
			` ) );

			const modelChangeStub = sinon.stub( model, 'change' ).named( 'model#change' );

			listStyleCommand.execute( { type: 'default' } );

			expect( getData( model ) ).to.equalMarkup( modelList( `
				Foo.[]
			` ) );

			expect( modelChangeStub.called ).to.equal( false );
		} );

		it( 'should not update anything if no listItem found in the selection (style no specified)', () => {
			setData( model, modelList( `
				Foo.[]
			` ) );

			const modelChangeStub = sinon.stub( model, 'change' ).named( 'model#change' );

			listStyleCommand.execute();

			expect( getData( model ) ).to.equalMarkup( modelList( `
				Foo.[]
			` ) );

			expect( modelChangeStub.called ).to.equal( false );
		} );
	} );
} );
