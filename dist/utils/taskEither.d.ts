import { Either } from "fp-ts/lib/Either";
import { Task } from "fp-ts/lib/Task";
import { TaskEither } from "fp-ts/lib/TaskEither";
export declare const fromTask: <L, A>(taskOfEither: Task<Either<L, A>>) => TaskEither<L, A>;
