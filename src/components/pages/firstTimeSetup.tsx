import { commands } from "@/bindings";
import { F7BookFill } from "@/components/icons/F7BookFill";
import { FluentLibraryFilled } from "@/components/icons/FluentLibraryFilled";
import { Button, Spinner } from "@/components/ui";
import { safeAsyncEventHandler } from "@/lib/async";
import { usePlatform } from "@/lib/platform/context";
import { useLibraryStore } from "@/stores/library/store";
import { createLibrary, setActiveLibrary } from "@/stores/settings/actions";
import { useState } from "react";
import styles from "./firstTimeSetup.module.css";

export interface FirstTimeSetupViewProps {
	/** Opens the folder picker and provisions the chosen library. */
	onChooseFolder: () => void;
	/** While a library is being opened or created, the action shows progress. */
	busy?: boolean;
}

/**
 * First-run welcome. The teaching counterpart to the empty-library state: the
 * library doesn't exist yet, so this names the two ways in (open an existing
 * Calibre library, or create a fresh one) before handing off to the folder
 * picker. Pure renderer — behaviour lives in {@link FirstTimeSetup}.
 */
export const FirstTimeSetupView = ({
	onChooseFolder,
	busy = false,
}: FirstTimeSetupViewProps) => {
	return (
		<div className={styles.page}>
			<section className={styles.card} aria-labelledby="fts-title">
				<span className={styles.mark} aria-hidden="true">
					<FluentLibraryFilled />
				</span>

				<h1 id="fts-title" className={styles.title}>
					Welcome to Citadel
				</h1>
				<p className={styles.lede}>
					Citadel reads and manages your Calibre library. Point it at a folder
					to get started.
				</p>

				<Button
					variant="primary"
					size="md"
					fullWidth
					autoFocus
					disabled={busy}
					onClick={onChooseFolder}
				>
					{busy ? (
						<span className={styles.busy}>
							<Spinner size={14} />
							Setting up your library…
						</span>
					) : (
						"Choose library folder…"
					)}
				</Button>

				<ul className={styles.paths}>
					<li className={styles.path}>
						<FluentLibraryFilled className={styles.pathIcon} aria-hidden />
						<span>
							<span className={styles.pathLead}>Already use Calibre?</span> Pick
							your existing library folder to open it here.
						</span>
					</li>
					<li className={styles.path}>
						<F7BookFill className={styles.pathIcon} aria-hidden />
						<span>
							<span className={styles.pathLead}>New to Calibre?</span> Choose an
							empty folder and Citadel creates a library in it.
						</span>
					</li>
				</ul>
			</section>
		</div>
	);
};

export const FirstTimeSetup = () => {
	const actions = useLibraryStore((state) => state.actions);
	const platform = usePlatform();
	const [busy, setBusy] = useState(false);

	const openFilePicker = async (): Promise<
		| { type: "existing library selected"; path: string }
		| { type: "new library selected"; path: string }
		| { type: "invalid library path selected" }
	> => {
		const path = await platform.dialogs.openDirectory({
			title: "Select Calibre Library Folder",
		});
		if (path === null) return { type: "invalid library path selected" };

		const selectedIsValid = await commands.clbQueryIsPathValidLibrary(path);

		if (selectedIsValid) {
			return { type: "existing library selected", path };
		}
		return { type: "new library selected", path };
	};

	const onChooseFolder = safeAsyncEventHandler(async () => {
		const returnStatus = await openFilePicker();
		if (returnStatus.type === "invalid library path selected") {
			return;
		}

		setBusy(true);
		try {
			if (returnStatus.type === "new library selected") {
				await actions.createLibrary(returnStatus.path);
			}
			const newLibraryId = await createLibrary(returnStatus.path);
			await setActiveLibrary(newLibraryId);
		} finally {
			setBusy(false);
		}
	});

	return <FirstTimeSetupView onChooseFolder={onChooseFolder} busy={busy} />;
};
