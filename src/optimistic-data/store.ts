import {
  MutationResultAction,
  isMutationInitAction,
  isMutationResultAction,
  isMutationErrorAction,
} from '../actions';

import {
  data,
} from '../data/store';

import {
  NormalizedCache,
} from '../data/storeUtils';

import {
  getDataWithOptimisticResults,
  Store,
} from '../store';

import assign = require('lodash/assign');
import pick = require('lodash/pick');

// a stack of patches of new or changed documents
export type OptimisticStore = {
  mutationId: string,
  data: NormalizedCache,
}[];

const optimisticDefaultState: any[] = [];

export function optimistic(
  previousState = optimisticDefaultState,
  action: any,
  store: any,
  config: any,
): OptimisticStore {
  if (isMutationInitAction(action) && action.optimisticResponse) {
    const fakeMutationResultAction: MutationResultAction = {
      type: 'APOLLO_MUTATION_RESULT',
      result: { data: action.optimisticResponse },
      document: action.mutation,
      operationName: action.operationName,
      mutationId: action.mutationId,
      resultBehaviors: action.resultBehaviors,
      extraReducers: action.extraReducers,
    };

    const fakeStore = assign({}, store, { optimistic: previousState }) as Store;
    const optimisticData = getDataWithOptimisticResults(fakeStore);
    const fakeDataResultState = data(
      optimisticData,
      fakeMutationResultAction,
      store.queries,
      store.mutations,
      config,
    );

    // TODO: apply extra reducers and resultBehaviors to optimistic store?

    const changedKeys = Object.keys(fakeDataResultState).filter(
      key => optimisticData[key] !== fakeDataResultState[key]);
    const patch = pick(fakeDataResultState, changedKeys);

    const optimisticState = {
      data: patch,
      mutationId: action.mutationId,
    };

    const newState = [...previousState, optimisticState];

    return newState;
  } else if ((isMutationErrorAction(action) || isMutationResultAction(action))
               && previousState.some(change => change.mutationId === action.mutationId)) {
    // throw away optimistic changes of that particular mutation
    const newState = previousState.filter(
      (change) => change.mutationId !== action.mutationId);

    return newState;
  }

  return previousState;
}
