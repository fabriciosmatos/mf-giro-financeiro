import { servicoDevedores } from './servicoDevedores';
import { servicoCarteiras } from './servicoCarteiras';
import { servicoHistorico } from './servicoHistorico';

export { OperationType, handleFirestoreError } from './servicoDevedores';

export const servicoDados = {
  ...servicoDevedores,
  ...servicoCarteiras,
  ...servicoHistorico,
};
