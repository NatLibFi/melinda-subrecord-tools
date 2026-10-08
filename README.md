# @natlibfi/melinda-subrecord-tools

SRU-based reader for Melinda parts-of-host MARC subrecords. The package
provides a subrecord picker that queries an SRU service
(`melinda.partsofhost` index) for the components of a Melinda host record and
returns them as parsed `@natlibfi/marc-record` `MarcRecord` instances.

## Install

```sh
npm install @natlibfi/melinda-subrecord-tools
```

## API

### `createSubrecordPicker(sruUrl, retrieveAll?, monoHostComponentsOnly?)`

Creates a subrecord picker.

- `sruUrl: string` — URL of the SRU service. Thrown `Error(400, 'Invalid sru url')` if omitted.
- `retrieveAll?: boolean` (default `false`) — if `true`, the underlying SRU client follows every page internally. `readSomeSubrecords` is not available with `retrieveAll: true` (it throws, since its single-page contract no longer holds).
- `monoHostComponentsOnly?: boolean` (default `false`) — if `true`, queries the `melinda.partsofmonohost` index instead of `melinda.partsofhost`.

Returns a `SubrecordPicker` with the methods below.

### `readSubrecordAmount(recordId) → Promise<SubrecordAmount>`

Returns the amount of subrecords for the host record.

```ts
interface SubrecordAmount {
  amount: number;
}
```

### `readSomeSubrecords(recordId, offset?) → Promise<SomeSubrecords>`

Returns a single page of subrecords, starting at `offset` (1-based, default `1`).

```ts
interface SomeSubrecords {
  amount: number;             // total amount of subrecords
  nextRecordOffset: number;   // offset of the next page (0 if no more)
  records: MarcRecord[];
}
```

### `readAllSubrecords(recordId) → Promise<AllSubrecords>`

Returns all subrecords of the host record (follows all pages).

```ts
interface AllSubrecords {
  amount: number;
  records: MarcRecord[];
}
```

Errors are `Error` instances (exported from the package) with `status`,
`payload` and `params` properties.

## Example

```js
import {createSubrecordPicker} from '@natlibfi/melinda-subrecord-tools';

const picker = createSubrecordPicker('https://sru.doria.fi/sru/');

const {amount} = await picker.readSubrecordAmount('12345');
const {records, nextRecordOffset} = await picker.readSomeSubrecords('12345', 1);
const all = await picker.readAllSubrecords('12345');
```

## License

MIT
