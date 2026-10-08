import {default as createSruClient} from '@natlibfi/sru-client';
import {MARCXML} from '@natlibfi/marc-record-serializers';
import type {MarcRecord} from '@natlibfi/marc-record';
import createDebugLogger from 'debug';
import {Error as ApiError} from '@natlibfi/melinda-commons';

const componentIndex = 'melinda.partsofhost';
const monoHostComponentIndex = 'melinda.partsofmonohost';

export interface SubrecordAmount {
  amount: number;
}

export interface Subrecords extends SubrecordAmount {
  records: MarcRecord[];
  /** Present from readSomeSubrecords (paging); absent from readAllSubrecords. */
  nextRecordOffset?: number;
}

export interface SubrecordPicker {
  readSubrecordAmount(recordId: string): Promise<SubrecordAmount>;
  readSomeSubrecords(recordId: string, offset?: number): Promise<Subrecords>;
  readAllSubrecords(recordId: string): Promise<Subrecords>;
}

export function createSubrecordPicker(sruUrl?: string, retrieveAll = false, monoHostComponentsOnly = false): SubrecordPicker {

  const debug = createDebugLogger('@natlibfi/melinda-subrecord-tools:subRecordPicker');

  debug(`SRU client url: ${sruUrl}`);
  if (sruUrl === undefined) {
    throw new ApiError(400, 'Invalid sru url');
  }

  const sruClient = createSruClient({url: sruUrl, recordSchema: 'marcxml', retrieveAll});
  // SRU client with maxRecordsPerRequest does not retrieve any records
  const sruClientForAmount = createSruClient({url: sruUrl, recordSchema: 'marcxml', retrieveAll, maxRecordsPerRequest: 0});

  const index = monoHostComponentsOnly ? monoHostComponentIndex : componentIndex;
  debug(`Using index ${index}, (monoHostComponentsOnly: ${monoHostComponentsOnly})`);

  return {readSubrecordAmount, readSomeSubrecords, readAllSubrecords};

  function readSubrecordAmount(recordId: string): Promise<SubrecordAmount> {
    debug(`Getting subrecord amount for ${recordId}`);
    return new Promise((resolve, reject) => {
      sruClientForAmount.searchRetrieve(`${index}=${recordId}`)
        .on('total', totalNumberOfRecords => {
          resolve({amount: totalNumberOfRecords});
        })
        .on('error', err => reject(err));
    });
  }

  function readSomeSubrecords(recordId: string, offset = 1): Promise<Subrecords> {
    // retrieveAll: true makes the SRU client follow every page internally, so
    // the 'end' event no longer carries a nextRecordOffset and this method
    // could not fulfill its single-page contract. Fail loudly instead.
    if (retrieveAll) {
      throw new ApiError(400, 'readSomeSubrecords requires retrieveAll: false (the picker was created with retrieveAll: true); use readAllSubrecords, or create the picker without retrieveAll, for paging');
    }
    debug(`Picking subrecords for ${recordId}`);
    return new Promise((resolve, reject) => {
      const promises: Promise<MarcRecord>[] = [];
      let amount: number | undefined;
      sruClient.searchRetrieve(`${index}=${recordId}`, {startRecord: offset})
        .on('total', totalNumberOfRecords => {
          amount = totalNumberOfRecords;
        })
        .on('record', xmlString => {
          promises.push(MARCXML.from(xmlString, {subfieldValues: false}));
        })
        .on('end', async nextRecordOffset => {
          try {
            const records = await Promise.all(promises);
            // amount is set by the 'total' event which always precedes 'end'
            resolve({nextRecordOffset, records, amount: amount!});
          } catch (error) {
            reject(error);
          }
        })
        .on('error', err => reject(err));
    });
  }

  function readAllSubrecords(recordId: string): Promise<Subrecords> {
    debug(`Picking subrecords for ${recordId}`);
    return new Promise((resolve, reject) => {
      const promises: Promise<MarcRecord>[] = [];
      let amount: number | undefined;
      sruClient.searchRetrieve(`${index}=${recordId}`)
        .on('total', totalNumberOfRecords => {
          amount = totalNumberOfRecords;
        })
        .on('record', xmlString => {
          promises.push(MARCXML.from(xmlString, {subfieldValues: false}));
        })
        .on('end', async () => {
          try {
            const records = await Promise.all(promises);
            // amount is set by the 'total' event which always precedes 'end'
            resolve({records, amount: amount!});
          } catch (error) {
            reject(error);
          }
        })
        .on('error', err => reject(err));
    });
  }
}
