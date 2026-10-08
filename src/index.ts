import {MarcRecord} from '@natlibfi/marc-record';

// Aleph creates partial subfields...
MarcRecord.setValidationOptions({subfieldValues: false});

export {createSubrecordPicker} from './subRecordPicker.ts';
export type {SubrecordPicker, SubrecordAmount, Subrecords} from './subRecordPicker.ts';
